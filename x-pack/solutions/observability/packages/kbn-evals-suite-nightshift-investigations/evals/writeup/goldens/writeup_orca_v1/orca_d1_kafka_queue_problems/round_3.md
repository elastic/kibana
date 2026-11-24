---
case_id: orca-d1-kafka-queue-problems
round_index: 2
source: variant-b
---

> **Asked:** What should we change so this doesn't happen again?

Make the DbContext per-message, make order upserts idempotent, and add bounded retry with a DLQ.
- Shared DbContext tracked conflicting OrderEntity instances, causing the key conflict.
- Unconditional DbContext.Add() at Consumer.cs:102 failed on reprocessed orderId.
- No retry limit let one order reprocess 101 times in 30 ms, causing a 2.5-hour storm.
