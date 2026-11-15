---
case_id: orca-d4-payment-unreachable
round_index: 0
source: variant-b
---

> **Asked:** Between approximately 2026-04-22 21:22 UTC and 2026-04-22 22:52 UTC, customers attempting to complete a purchase by clicking "Place Order" on the cart page received an immediate error and were kept on the cart page rather than being taken to the order confirmation screen. The failure resolved in roughly 50 milliseconds, noticeably faster than other checkout error patterns users have reported. No payments were processed, no orders were created, and no items were removed from affected carts during this window. Monitoring telemetry covering 2026-04-22 20:00 UTC through 2026-04-23 00:00 UTC is available, including logs, distributed traces, and service metrics from the checkout flow.
>
> Please investigate to identify the root cause: which component in the checkout pipeline was responsible for these failures, what exactly went wrong within that component, and what evidence in the available telemetry supports your conclusion.
>
>
>
>
> Additional context: {"source":"manual","manual_id":"manual","trigger_type":"manual","summary":"Between approximately 2026-04-22 21:22 UTC and 2026-04-22 22:52 UTC, customers attempting to complete a purchase by clicking \"Place Order\" on the cart page received an immediate error and were kept o…"}

The `paymentUnreachable` flagd flag was set to `on` from 21:20-22:50 UTC, injecting a DNS failure into checkout's payment call.
- Checkout called the payment service, which failed DNS lookup, so PlaceOrder errored before charging, writing the order, or touching the cart.
- 124 flag-on resolutions line up exactly with 124 PlaceOrder failures carrying the DNS error.
- Next step: confirm if the toggle was intentional (chaos test) or accidental, then revert and add alerting.
