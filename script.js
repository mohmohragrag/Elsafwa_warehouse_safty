function get(id) {
    const el = document.getElementById(id);
    if (!el || el.disabled) return null;
    return parseFloat(el.value);
}

function calc_I_BuiltUp(bf, tf, tw, hw) {
    const h_total = hw + 2 * tf;
    const d = (h_total / 2) - (tf / 2);
    const I_flange = 2 * ((bf * tf ** 3) / 12 + (bf * tf) * d ** 2);
    const I_web = (tw * hw ** 3) / 12;
    return I_flange + I_web;
}

function calc_I_Box(length, width, thickness) {
    return (length * width ** 3 - (length - 2 * thickness) * (width - 2 * thickness) ** 3) / 12;
}

function calc_I_Pipe(outer_dia, thickness) {
    const inner_dia = outer_dia - 2 * thickness;
    return (Math.PI / 64) * (outer_dia ** 4 - inner_dia ** 4);
}

function getSectionI(prefix) {
    const type = document.getElementById(`${prefix}_type`).value;
    if (type === "builtup") {
        const bf = get(`${prefix}_bf`), tf = get(`${prefix}_tf`),
              tw = get(`${prefix}_tw`), hw = get(`${prefix}_hw`);
        return { I: calc_I_BuiltUp(bf, tf, tw, hw), y: (hw + 2 * tf) / 2 };
    } else if (type === "box") {
        const l = get(`${prefix}_l`), w = get(`${prefix}_w`), t = get(`${prefix}_t`);
        return { I: calc_I_Box(l, w, t), y: w / 2 };
    } else if (type === "pipe") {
        const d = get(`${prefix}_d`), t = get(`${prefix}_t`);
        return { I: calc_I_Pipe(d, t), y: d / 2 };
    }
    return { I: 0, y: 0 };
}

function toggleSectionFields(sectionId, type) {
    document.querySelectorAll(`#${sectionId} .builtup, #${sectionId} .box, #${sectionId} .pipe`)
        .forEach(el => el.style.display = 'none');
    document.querySelectorAll(`#${sectionId} .${type}`).forEach(el => el.style.display = 'block');
}

document.querySelectorAll('.section-type-select').forEach(select => {
    select.addEventListener('change', function () {
        toggleSectionFields(this.dataset.section, this.value);
    });
});

document.getElementById("frameForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const span = get("span"), H = get("H"), H_total = get("H_total"), spacing = get("spacing"),
          load_area = get("load_area"), fy = get("fy"), FS = get("FS"), E = 210000, K = get("K");

    const rise = H_total - H;
    const Lr = Math.sqrt((span / 2) ** 2 + rise ** 2) * 1000;
    const w = load_area * spacing;
    const M = (w * (Lr / 1000) ** 2) / 8;

    const rafter = getSectionI("rafter");
    const column = getSectionI("column");

    const sigma_r = (M * 1e6 * rafter.y) / rafter.I;
    const sigma_allow = fy / FS;

    const delta = (5 * w * (Lr ** 4)) / (384 * E * 1e3 * rafter.I);
    const delta_allow = Lr / 250;

    const P = w * (Lr / 1000) / 2 * 1e3;
    const L_col = H * 1000;
    const P_cr = (Math.PI ** 2 * E * 1e3 * column.I) / ((K * L_col) ** 2);
    const P_allow = P_cr / FS;

    const is_safe = sigma_r <= sigma_allow && delta <= delta_allow && P <= P_allow;

    const results = `
        <h2>النتائج:</h2>
        <p>طول الرافتر المائل Lr (مم): ${Lr.toFixed(2)}</p>
        <p>العزم المؤثر M (kNm): ${M.toFixed(2)}</p>
        <p>إجهاد الرافتـر (MPa): ${sigma_r.toFixed(2)} / المسموح: ${sigma_allow.toFixed(2)}</p>
        <p>الانحراف (مم): ${delta.toFixed(2)} / المسموح: ${delta_allow.toFixed(2)}</p>
        <p>قوة العمود (N): ${P.toFixed(2)} / المسموح: ${P_allow.toFixed(2)}</p>
        <p><strong style="color: ${is_safe ? 'green' : 'red'};">${is_safe ? "الإطار آمن" : "الإطار غير آمن"}</strong></p>
    `;

    document.getElementById("results").innerHTML = results;
});
