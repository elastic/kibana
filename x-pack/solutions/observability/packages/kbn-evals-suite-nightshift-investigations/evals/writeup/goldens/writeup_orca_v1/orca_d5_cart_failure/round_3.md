---
case_id: orca-d5-cart-failure
round_index: 2
source: variant-b
---

> **Asked:** Why 15 seconds exactly?

frontend-proxy enforces a fixed 15 s request timeout, unrelated to cart's actual retry time.
- Client spans cut off at 14.997–15.006s every time, a timeout signature.
- cart's EmptyCart span ran 130s–1227s, still retrying Redis after proxy gave up.
- Users saw errors at a fixed 15s mark regardless of cart's eventual success or failure.
