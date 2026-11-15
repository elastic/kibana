---
case_id: orca-d1-kafka-queue-problems
round_index: 0
source: variant-b
---

> **Asked:** Between 2026-04-19 20:33 UTC and 2026-04-19 23:03 UTC, monitoring flagged unusual behaviour in the shop's backend services. No user-visible symptoms were recorded during this window, meaning the issue did not surface directly to customers. Telemetry covering the period from 2026-04-19 20:00 UTC to 2026-04-20 00:00 UTC is available for review, including logs, traces, and metrics across the shop's services.
>
> Please investigate to identify the root cause: which backend component was responsible for the anomalous behaviour, what exactly was going wrong within that component during the affected window, and what specific evidence in the available telemetry supports your conclusion.
>
>
>
>
> Additional context: {"source":"manual","manual_id":"manual","trigger_type":"manual","summary":"Between 2026-04-19 20:33 UTC and 2026-04-19 23:03 UTC, monitoring flagged unusual behaviour in the shop's backend services. No user-visible symptoms were recorded during this window, meaning the issu…"}

The accounting service's Kafka order-consumer threw repeated EF Core InvalidOperationException errors from 20:30 to 23:05 UTC.
- Errors jumped from ~0 to 200-1000+ per 5-min bucket, same duplicate-tracking exception each time.
- Kafka re-delivered the same orders repeatedly after failed processing, not a real traffic spike.
- No customer-facing impact; next step is accounting team review of DbContext scope/attach logic.
