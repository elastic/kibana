---
case_id: orca-d4-payment-unreachable
round_index: 1
source: variant-b
---

> **Asked:** Why did the error come back so fast, in about 50 ms?

DNS lookup for "badAddress" fails instantly, since no real host or network timeout is involved.
- 127.0.0.11:53 (local resolver) returns 'server misbehaving' immediately, not a timeout.
- Call aborts before any TCP connection or payment attempt, so no charge or order write happens.
- 124 failed PlaceOrder spans lasted 17ms to 68ms, averaging ~33ms, confirming a resolver error.
