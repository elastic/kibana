---
case_id: orca-d5-cart-failure
round_index: 1
source: variant-b
---

> **Asked:** Were customers charged twice when they retried?

No, no customer was charged twice; all 228 charges had distinct transaction IDs.
- Checkout stayed correct: 104 PlaceOrder calls during 18:58–20:28 hang, 0 errors.
- Hangs hit AddItem/EmptyCart only, which never call PaymentService/Charge.
- Separate issue: 5 failures at 20:29–20:59 UTC, gold-tier loyalty token errors, unrelated to retries.
