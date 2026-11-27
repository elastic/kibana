---
case_id: orca-d5-cart-failure
round_index: 0
source: variant-b
---

> **Asked:** Between approximately 2026-04-23 18:58 UTC and 2026-04-23 20:28 UTC, customers attempting to place orders from the cart page experienced roughly 15-second hangs before receiving an error, leaving them on the cart page with no order confirmation and their cart still showing items — despite the fact that payment was charged and fulfilment proceeded normally in the background. Similarly, customers clicking "Empty Cart" during the same window saw the same 15-second delay followed by a failure, with their cart contents remaining unchanged. Both actions that modify or clear the cart were affected, while the underlying order processing appeared to complete successfully. Telemetry including logs, traces, and metrics is available for the window 2026-04-23 18:00 UTC to 2026-04-23 21:00 UTC, covering the full incident period and surrounding context.
>
> Please investigate to identify the root cause: which component or service is responsible for this behaviour, what exactly is going wrong within it, and what evidence in the telemetry supports your conclusion.
>
>
>
>
> Additional context: {"source":"manual","manual_id":"manual","trigger_type":"manual","summary":"Between approximately 2026-04-23 18:58 UTC and 2026-04-23 20:28 UTC, customers attempting to place orders from the cart page experienced roughly 15-second hangs before receiving an error, leaving the…"}

The cart service lost reliable connection to valkey-cart at 19:00:50 UTC, blocking cart updates for ~15s each.
- Cart calls wait on the cache with no short timeout, so requests queued until the 15s frontend-proxy deadline hit.
- Payment and fulfilment were unaffected; only cart add/empty actions failed.
- Cache connection errors continued past the 20:28 UTC recovery, so root cause may not be fully resolved.
