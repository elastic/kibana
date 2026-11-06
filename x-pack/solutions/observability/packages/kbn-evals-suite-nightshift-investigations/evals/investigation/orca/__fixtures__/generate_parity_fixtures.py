"""Generates the ORCA grader parity fixtures with ORCA's own verifier.

Usage:
  python3 -I generate_parity_fixtures.py <check_prediction.py> --synthetic
  python3 -I generate_parity_fixtures.py <check_prediction.py> --harbor <orca-bench dir> <out.json>

<check_prediction.py> is `tests/check_prediction.py` from any task of the public Harbor dataset
`orca-bench/orca-bench`; every task carries the same file. Needs `tabulate` (0.10.0 when these
fixtures were generated).

--synthetic renders the hand-written rubrics in `synthetic_rubrics.json` and writes `parity.json`
next to this script, which `check_prediction.test.ts` reads. No ORCA ground truth is committed.

--harbor renders ORCA's real rubrics: one task per rubric set, plus three real controls, and writes
the fixture to <out.json>. Keep it outside the repo and point the test at it:
  ORCA_PARITY_FIXTURES=<out.json> node scripts/jest <path to check_prediction.test.ts>
"""

import hashlib
import importlib.util
import json
import sys
from pathlib import Path

import tabulate

HERE = Path(__file__).resolve().parent
verifier = Path(sys.argv[1])
spec = importlib.util.spec_from_file_location("check_prediction", verifier)
cp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cp)

# A report that would break a naive port: format placeholders, String.replace patterns, braces,
# backticks, a table and non-ASCII text.
REPORT = """## Summary

Between 20:52 and 21:10 UTC on April 22, `checkout` returned HTTP 500 for ~50% of `POST /api/checkout` \
requests due to the `paymentFailure` flag — see {rubrics} and {predictions} for nothing; $& $1 $$ $' {}.

## Timeline

```
20:52 UTC — paymentFailure set to 50%
```

## 5 Whys

Problem statement:
Checkout fails → users cannot pay.

## Remediation

| Action | Targets | Type |
|--------|---------|------|
| Revert flag | Why 1 | Root cause fix |
"""


def control_prompt(expected):
    """`_judge_control`'s prompt, without the LLM call."""
    margin = cp.timedelta(minutes=cp.CONTROL_QUIET_WINDOW_MARGIN_MIN)
    qstart, qend = expected.get("quiet_window_start"), expected.get("quiet_window_end")
    return cp.JUDGE_PROMPT_CONTROL.format(
        current_time=expected["current"],
        quiet_window_start=(cp.datetime.fromisoformat(qstart) + margin).isoformat() if qstart else "null",
        quiet_window_end=(cp.datetime.fromisoformat(qend) - margin).isoformat() if qend else "null",
        predictions=REPORT,
    )


def verdict(flag, score, match=False, metrics=(), logs=(), traces=()):
    return {
        "feature_flag": flag,
        "incident_time_within_10min": match,
        "feature_flag_match": match,
        "mechanism_match": False,
        "symptoms": {
            "metrics": [{"metric_family": "m", "family_match": hit} for hit in metrics],
            "logs": [{"body_match": a, "service_name_match": b} for a, b in logs],
            "traces": [{"call_chain_match": a, "smoking_gun_match": b} for a, b in traces],
        },
        "score": score,
    }


NESTED_CASES = [
    ("llm_judge", {"rubrics": [verdict("a", 3, True, (True, False), ((True, True),), ((True, False),))]}),
    ("llm_judge", {"rubrics": [verdict("a", 3, True), verdict("b", 1, False, (), ((False, True),))]}),
    ("llm_judge", {"rubrics": [verdict("a", 2, True), verdict("b", 2, True, (True,))]}),
    ("llm_judge", {"rubrics": [verdict("a", 0), verdict("b", 1)]}),
    ("empty_report", {"rubrics": [verdict("a", 0), verdict("b", 0)]}),
    ("no_incident_llm_judge", {"rubrics": [verdict("(no_incident)", 3)]}),
]


def fixture(rubrics, sets, controls, keep_prompt):
    incident = []
    for ids in sets:
        # The verifier loads `sorted(rubrics_dir.glob("*.json"))`, so the order is by file name.
        prompt = cp.build_judge_prompt([rubrics[i] for i in sorted(ids, key=lambda i: i + ".json")], REPORT)
        entry = {"event_ids": list(ids), "sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest()}
        if keep_prompt(ids):
            entry["prompt"] = prompt
        incident.append(entry)
    aggregates = []
    for mode, nested in NESTED_CASES:
        agg = cp.aggregate_judge_response(nested, mode=mode)
        reward = (agg["rca_depth"] or 0.0) / 3.0
        aggregates.append({"mode": mode, "nested": nested, "aggregate": agg, "rewards": cp.build_rewards(agg, reward)})
    return {
        "generated_by": "generate_parity_fixtures.py",
        "check_prediction_sha256": hashlib.sha256(verifier.read_bytes()).hexdigest(),
        "tabulate": tabulate.__version__,
        "report": REPORT,
        "rubrics": rubrics,
        "incident_schema": cp.build_judge_output_schema([]),
        "control_schema": cp.CONTROL_OUTPUT_SCHEMA,
        "incident": incident,
        "control": [{"expected": expected, "prompt": control_prompt(expected)} for expected in controls],
        "aggregates": aggregates,
    }


def write(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


mode = sys.argv[2]
if mode == "--synthetic":
    rubrics = json.loads((HERE / "synthetic_rubrics.json").read_text())
    ids = sorted(rubrics)
    sets = [[i] for i in ids] + [ids[:2], list(reversed(ids))]
    controls = [
        {"events": [], "current": "2026-04-22T09:00:00-04:00",
         "quiet_window_start": "2026-04-21T22:46:44.092046+00:00", "quiet_window_end": "2026-04-22T14:21:00.987886+00:00"},
        {"events": [], "current": "2026-04-19T09:00:00-04:00", "quiet_window_end": "2026-04-19T14:01:51.404464+00:00"},
        # No end, and a start without microseconds: Python's isoformat then drops the fraction.
        {"events": [], "current": "2026-04-20T01:00:00Z", "quiet_window_start": "2026-04-19T23:59:00.000000+00:00"},
    ]
    write(HERE / "parity.json", fixture(rubrics, sets, controls, lambda _: True))
    print(f"{len(rubrics)} synthetic rubrics, {len(sets)} sets, {len(controls)} controls")
elif mode == "--harbor":
    harbor, out = Path(sys.argv[3]), Path(sys.argv[4])
    rubrics, sets, controls = {}, {}, []
    for task in sorted(path for path in harbor.iterdir() if (path / "tests" / "expected.json").is_file()):
        assert (task / "tests" / "check_prediction.py").read_bytes() == verifier.read_bytes(), task
        expected = json.loads((task / "tests" / "expected.json").read_text())
        paths = sorted((task / "tests" / "rubrics").glob("*.json"))
        if not expected.get("events"):
            controls.append(expected)
            continue
        for path in paths:
            data = json.loads(path.read_text())
            assert rubrics.setdefault(path.stem, data) == data, path
        sets.setdefault(tuple(path.stem for path in paths), task.name)
    picked = [next(c for c in controls if "quiet_window_start" in c), next(c for c in controls if "quiet_window_start" not in c)]
    write(out, fixture(rubrics, sorted(sets), picked, lambda _: False))
    print(f"{len(rubrics)} rubrics, {len(sets)} rubric sets, {len(controls)} controls -> {out}")
else:
    sys.exit(__doc__)
