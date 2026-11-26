---
case_id: orca-d2-product-catalog-failure
round_index: 2
source: variant-b
---

> **Asked:** How many checkouts failed in that window?

19 of 96 checkout attempts failed between 18:39–20:09 UTC.
- All 19 failed on GetProduct lookup for Explorascope (OLJCESPC7Z).
- product-catalog blocked that lookup via a feature flag, not an outage.
- Frontend showed 38 error spans, but that's 19 failures double-counted.
