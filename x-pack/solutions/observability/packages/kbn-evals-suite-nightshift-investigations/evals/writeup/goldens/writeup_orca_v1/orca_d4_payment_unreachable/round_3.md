---
case_id: orca-d4-payment-unreachable
round_index: 2
source: variant-b
---

> **Asked:** Were any customers charged?

No customers were charged; all 127 Charge calls from 21:20–22:50 UTC failed.
- Payment service never received requests; DNS failures blocked the gRPC calls before arrival.
- No money moved for any of the ~124 failed checkout attempts.
