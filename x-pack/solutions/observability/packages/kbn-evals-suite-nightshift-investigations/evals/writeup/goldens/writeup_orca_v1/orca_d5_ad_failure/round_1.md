---
case_id: orca-d5-ad-failure
round_index: 0
source: variant-b
---

> **Asked:** Users of the web shop report that the ad banner at the bottom of product detail pages and the order confirmation page sometimes shows up as an empty yellow box with no text and no link. The rest of the page loads normally. It was first noticed around 2026-04-23 14:26 UTC and stopped around 2026-04-23 16:56 UTC. Telemetry (logs, traces and metrics for the OpenTelemetry Demo shop services) is available from 2026-04-23 13:00 UTC to 2026-04-23 18:00 UTC. Find the root cause: which component is responsible, what exactly goes wrong, and what evidence supports it.
>
>
>
>
> Additional context: {"source":"manual","manual_id":"manual","trigger_type":"manual","summary":"Users of the web shop report that the ad banner at the bottom of product detail pages and the order confirmation page sometimes shows up as an empty yellow box with no text and no link. The rest of t…"}

The ad service returned gRPC UNAVAILABLE errors, so frontend rendered the empty yellow ad placeholder.
- flagd's adFailure chaos flag caused 30 UNAVAILABLE errors, 14:30:35Z-16:49:13Z.
- ad service's internal getAdsByCategory lookup succeeded; CPU/memory/GC stayed flat, ruling out resource issues.
- ~2% of ad requests failed; disable adFailure flag in flagd or confirm it was an intentional chaos test.
