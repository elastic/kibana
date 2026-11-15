---
case_id: orca-d1-kafka-queue-problems
round_index: 1
source: variant-b
---

> **Asked:** Did this lose or delay any orders?

No orders were lost; 178 of 185 orders were delayed by retries, not new traffic.
- Each delayed order retried about 100 times until the tracking conflict cleared.
- Delays lasted from minutes up to nearly the full 2.5 h incident.
- Checkout succeeded normally; only the downstream accounting/ledger update was stuck retrying.
