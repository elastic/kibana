---
case_id: orca-d2-product-catalog-failure
round_index: 0
source: variant-b
---

> **Asked:** **On-Call Investigation Report**
> **Window of Impact:** 2026-04-20 18:39 UTC – 2026-04-20 20:09 UTC
> **Telemetry Available:** 2026-04-20 18:00 UTC – 2026-04-20 21:00 UTC
>
> ---
>
> Starting at approximately 2026-04-20 18:39 UTC and resolving around 2026-04-20 20:09 UTC, customers attempting to view the product page for the National Park Foundation Explorascope (OLJCESPC7Z) received HTTP 500 errors and were shown no product information. Any user who added OLJCESPC7Z to their cart found that all subsequent cart views returned 500 with a broken or empty cart, and this degraded state persisted across their entire session — affecting other products in the cart as well — until the cart was manually cleared. Checkout attempts for any cart containing OLJCESPC7Z failed with a "failed to get product OLJCESPC7Z" error, regardless of whether the Explorascope itself was being purchased. Additionally, the recommendations section on product pages intermittently returned 500 errors during this window whenever OLJCESPC7Z appeared in the recommended set. Logs, traces, and metrics from the shop's backend services are available for the full period from 2026-04-20 18:00 UTC to 2026-04-20 21:00 UTC.
>
> ---
>
> **To the investigator:** Please examine the available telemetry to determine the root cause of this incident. Specifically, we need to know which backend component or service is responsible for these failures, what exactly went wrong with it during the 18:39–20:09 UTC window, and what log entries, trace spans, or metric signals from the available telemetry support that conclusion.
>
>
>
>
> Additional context: {"source":"manual","manual_id":"manual","trigger_type":"manual","summary":"**On-Call Investigation Report** **Window of Impact:** 2026-04-20 18:39 UTC – 2026-04-20 20:09 UTC **Telemetry Available:** 2026-04-20 18:00 UTC – 2026-04-20 21:00 UTC --- Starting at approximately 2…"}

Feature flag `productCatalogFailure` forced GetProduct to fail for OLJCESPC7Z from 18:39 to 20:09 UTC.
- 181 error spans confirm product-catalog's GetProduct call failed for OLJCESPC7Z.
- Frontend, checkout, and recommendation all broke because they share this GetProduct call.
- Flag reverted at 20:09 UTC, stopping the errors; likely chaos/fault-injection, not a code or infra failure.
