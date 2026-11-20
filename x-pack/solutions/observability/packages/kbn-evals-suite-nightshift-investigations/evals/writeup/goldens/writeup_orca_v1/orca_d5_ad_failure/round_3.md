---
case_id: orca-d5-ad-failure
round_index: 2
source: variant-b
---

> **Asked:** Is it fixed now?

Yes, GetAds recovered on its own by 16:56 UTC, with 0% errors through 18:00 UTC.
- Last GetAds failure was at 16:49:13 UTC, down from ~9.3% error rate during the incident.
- No deploy or config change found; likely the adFailure chaos flag stopped on its own.
- Telemetry ends at 18:00 UTC, so recovery beyond that time is unconfirmed.
