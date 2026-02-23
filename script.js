const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRI6tQzVEzx8SGh3fteplIkUpfcYHOwh6PCZfJFSK27hz9SN9U3Vk1JLhIVOqs3AjtK1AmtmUxQqtA6/pub?gid=1041212889&single=true&output=csv';

async function fetchAndRenderData() {
    try {
        const cacheBuster = new Date().getTime();
        const fetchUrl = `${CSV_URL}&t=${cacheBuster}`;

        const response = await fetch(fetchUrl);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const csvText = await response.text();

        Papa.parse(csvText, {
            header: false,
            complete: function (results) {
                const data = results.data;
                console.log("Parsed Data:", data);
                processData(data);
            },
            error: function (err) {
                console.error("Error parsing CSV:", err);
                showError("حدث خطأ في قراءة البيانات");
            }
        });
    } catch (error) {
        console.error("Fetch Error:", error);
        showError("حدث خطأ في الاتصال، قد يكون المتصفح يمنع جلب البيانات من ملف محلي. جرب فتح الصفحة عبر خادم محلي (Localhost).");
    }
}

function processData(rows) {
    let stats = {};
    let contributors = [];

    let isContributorsSection = false;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const key = row[0] ? row[0].trim() : "";
        const val = row[1] ? row[1].trim() : "";

        // Break if we hit the contributors header
        if (key === 'الترتيب') {
            isContributorsSection = true;
            continue;
        }

        if (!isContributorsSection) {
            if (key === 'الهدف الكلي') stats.totalGoal = val;
            else if (key === 'التبرعات') stats.donations = val;
            else if (key === 'المبلغ المتبقي') stats.remaining = val;
            else if (key === 'نسبة الإنجاز') {
                stats.percentage = val;
            }
            else if (key === 'عدد المتبرعين') stats.donorsCount = val;
            else if (key === 'متوسط التبرع') stats.avgDonation = val;
        } else {
            // Processing contributors
            if (key && !isNaN(parseInt(key))) { // If rank is a number
                contributors.push({
                    rank: key,
                    name: val,
                    amount: row[2] ? row[2].trim() : ""
                });
            }
        }
    }

    updateUI(stats, contributors);
}

function updateUI(stats, contributors) {
    // Safely update DOM elements if they exist
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    setText('total-goal', stats.totalGoal || '0');
    setText('total-donations', stats.donations || '0');
    setText('remaining-amount', stats.remaining || '0');

    setText('donors-count', stats.donorsCount || '0');

    // Update Percentage and Progress Bar
    const progressEl = document.getElementById('progress-bar');
    const percentageEl = document.getElementById('completion-percentage');
    let percentNum = parseFloat(stats.percentage?.replace('%', '')) || 0;

    // Animate progress bar
    if (progressEl) {
        setTimeout(() => {
            progressEl.style.width = Math.min(percentNum, 100) + '%';
        }, 100);
    }
    if (percentageEl) {
        percentageEl.innerText = stats.percentage || '0%';
    }

    // Render Contributors
    const tbody = document.getElementById('contributors-list');
    if (tbody) {
        tbody.innerHTML = ''; // clear loading

        if (contributors.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="loading-text">لا يوجد مساهمين بعد</td></tr>';
            return;
        }

        contributors.forEach(c => {
            const tr = document.createElement('tr');
            // Add rank classes for top 3
            if (c.rank == 1) tr.classList.add('rank-1');
            if (c.rank == 2) tr.classList.add('rank-2');
            if (c.rank == 3) tr.classList.add('rank-3');

            let rankContent = c.rank;

            tr.innerHTML = `
                <td>${rankContent}</td>
                <td>${c.name}</td>
                <td>${c.amount}</td> <!-- The amount already has commas, just displaying it as is -->
            `;
            tbody.appendChild(tr);
        });
    }
}

function showError(msg) {
    const tbody = document.getElementById('contributors-list');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="3" class="loading-text text-red">${msg}</td></tr>`;
    }
}

// Initial fetch
document.addEventListener('DOMContentLoaded', fetchAndRenderData);

// Auto-refresh every 5 minutes (300000 ms)
setInterval(fetchAndRenderData, 300000);

// Copy text to clipboard
function copyText(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
        const originalHTML = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fa-solid fa-check"></i>';
        btnElement.style.color = 'var(--success)';

        setTimeout(() => {
            btnElement.innerHTML = originalHTML;
            btnElement.style.color = 'var(--text-main)';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('حدث خطأ أثناء النسخ');
    });
}
