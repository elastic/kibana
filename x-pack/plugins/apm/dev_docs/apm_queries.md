# Transactions

Transactions are stored in two different formats:

#### Individual transactions document

A single transaction with a latency of 2ms

```json
{
  "@timestamp": "2021-09-01T10:00:00.000Z",
  "processor.event": "transaction",
  "transaction.duration.us": 2000,
  "event.outcome": "success"
}
```

or

#### Aggregated (metric) document:
A pre-aggregated document where `_doc_count` is the number of original transactions. 

```json
{
  "_doc_count": 2,
  "@timestamp": "2021-09-01T10:00:00.000Z",
  "processor.event": "metric",
  "metricset.name": "transaction",
  "transaction.duration.histogram": {
    "counts": [1, 1],
    "values": [2000, 3000]
  },
  "event.outcome": "success"
}
```

### Latency

Latency is the duration of transactions. This can be calculated using transaction events or metric events (aggregated transactions).

Note-worthy fields: `transaction.duration.us`, `transaction.duration.histogram`

#### Transaction-based latency

```json
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [{ "terms": { "processor.event": ["transaction"] } }]
    }
  },
  "aggs": {
    "latency": { "avg": { "field": "transaction.duration.us" } }
  }
}
```

#### Metric-based latency

```json
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "terms": { "processor.event": ["metric"] } },
        { "term": { "metricset.name": "transaction" } }
      ]
    }
  },
  "aggs": {
    "latency": { "avg": { "field": "transaction.duration.histogram" } }
  }
}
```

Please note: `metricset.name: transaction` was only recently introduced. To retain backwards compatability we still use the old filter `{ "exists": { "field": "transaction.duration.histogram" }}` when filtering for aggregated transactions.

### Throughput

Throughput is the number of transactions per minute. This can be calculated using transaction events or metric events.

Note-worthy fields: None (based on doc count)

```js
{
  "size": 0,
  "query": {
    // same filters as for latency
  },
  "aggs": {
    "throughput": { "rate": { "unit": "minute" } }
  }
}
```

### Failed transaction rate

The number of transactions with `event.outcome=failure` per minute.
Note-worthy fields: `event.outcome`

```json
{
  "size": 0,
  "query": {},
  "aggs": {
    "outcomes": {
      "terms": {
        "field": "event.outcome",
        "include": ["failure", "success"]
      }
    }
  }
}
```

# System metrics

System metrics are captured periodically (every 60 seconds by default).

### CPU

Note-worthy fields: `system.cpu.total.norm.pct`, `system.process.cpu.total.norm.pct`

#### Sample document

```json
{
  "@timestamp": "2021-09-01T10:00:00.000Z",
  "processor.event": "metric",
  "metricset.name": "app",
  "system.process.cpu.total.norm.pct": 0.003,
  "system.cpu.total.norm.pct": 0.28
}
```

#### Query

```json
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "terms": { "processor.event": ["metric"] } },
        { "terms": { "metricset.name": ["app"] } }
      ]
    }
  },
  "aggs": {
    "systemCPUAverage": { "avg": { "field": "system.cpu.total.norm.pct" } },
    "processCPUAverage": {
      "avg": { "field": "system.process.cpu.total.norm.pct" }
    }
  }
}
```

### Memory

Note-worthy fields: `system.memory.actual.free`, `system.memory.total`,

#### Sample document

```json
{
  "@timestamp": "2021-09-01T10:00:00.000Z",
  "processor.event": "metric",
  "metricset.name": "app",
  "system.memory.actual.free": 13182939136,
  "system.memory.total": 15735697408
}
```

#### Query

```js
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "terms": { "processor.event": ["metric"] }},
        { "terms": { "metricset.name": ["app"] }}

        // ensure the memory fields exists
        { "exists": { "field": "system.memory.actual.free" }},
        { "exists": { "field": "system.memory.total" }},
      ]
    }
  },
  "aggs": {
    "memoryUsedAvg": {
      "avg": {
        "script": {
          "lang": "expression",
          "source": "1 - doc['system.memory.actual.free'] / doc['system.memory.total']"
        }
      }
    }
  }
}
```

Above example is overly simplified. In reality [we do a bit more](https://github.com/elastic/kibana/blob/fe9b5332e157fd456f81aecfd4ffa78d9e511a66/x-pack/plugins/apm/server/lib/metrics/by_agent/shared/memory/index.ts#L51-L71) to properly calculate memory usage inside containers

# Transaction breakdown metrics

A pre-aggregations of transaction documents where `transaction.breakdown.count` is the number of original transactions.

Note-worthy fields: `transaction.type`

#### Sample document

```json
  {
    "@timestamp": "2021-09-27T21:59:59.828Z",
    "processor.event": "metric",
    "metricset.name": "transaction_breakdown",
    "transaction.breakdown.count": 12,
    "transaction.type": "request"
  }
}
```

# Span breakdown metrics

A pre-aggregations of span documents where `span.self_time.count` is the number of original spans.

Note-worthy fields: `span.type`, `span.subtype`, `span.self_time.*`

#### Sample document

```json
{
  "@timestamp": "2021-09-27T21:59:59.828Z",
  "processor.event": "metric",
  "metricset.name": "span_breakdown",
  "span.self_time.sum.us": 1028,
  "span.self_time.count": 12,
  "span.type": "db",
  "span.subtype": "elasticsearch"
}
```

#### Query

```json
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "terms": { "processor.event": ["metric"] } },
        { "terms": { "metricset.name": ["span_breakdown"] } }
      ]
    }
  },
  "aggs": {
    "total_self_time": { "sum": { "field": "span.self_time.sum.us" } },
    "types": {
      "terms": { "field": "span.type" },
      "aggs": {
        "subtypes": {
          "terms": { "field": "span.subtype" },
          "aggs": {
            "self_time_per_subtype": {
              "sum": { "field": "span.self_time.sum.us" }
            }
          }
        }
      }
    }
  }
}
```

# Service destination metrics

Pre-aggregations of span documents, where `span.destination.service.response_time.count` is the number of original spans.

Note-worthy fields: `span.destination.service.*`

#### Sample document

A pre-aggregated document with 73 span requests from opbeans-ruby to elasticsearch, and a combined latency of 1554ms

```json
{
  "@timestamp": "2021-09-01T10:00:00.000Z",
  "processor.event": "metric",
  "metricset.name": "service_destination",
  "service.name": "opbeans-ruby",
  "span.destination.service.response_time.count": 73,
  "span.destination.service.response_time.sum.us": 1554192,
  "span.destination.service.resource": "elasticsearch",
  "event.outcome": "success"
}
```

### Latency

The latency between a service and an (external) endpoint

```json
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "terms": { "processor.event": ["metric"] } },
        { "term": { "metricset.name": "service_destination" } },
        { "term": { "span.destination.service.resource": "elasticsearch" } }
      ]
    }
  },
  "aggs": {
    "latency_sum": {
      "sum": { "field": "span.destination.service.response_time.sum.us" }
    },
    "latency_count": {
      "sum": { "field": "span.destination.service.response_time.count" }
    }
  }
}
```

### Throughput

Captures the number of requests made from a service to an (external) endpoint


#### Query

```json
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "terms": { "processor.event": ["metric"] } },
        { "term": { "metricset.name": "service_destination" } },
        { "term": { "span.destination.service.resource": "elasticsearch" } }
      ]
    }
  },
  "aggs": {
    "throughput": {
      "rate": {
        "field": "span.destination.service.response_time.count",
        "unit": "minute"
      }
    }
  }
}
```

## Common filters

Most Elasticsearch queries will need to have one or more filters. There are a couple of reasons for adding filters:

- correctness: Running an aggregation on unrelated documents will produce incorrect results
- stability: Running an aggregation on unrelated documents could cause the entire query to fail
- performance: limiting the number of documents will make the query faster

```js
{
  "query": {
    "bool": {
      "filter": [
        // service name
        { "term": { "service.name": "opbeans-go" }},

        // service environment
        { "term": { "service.environment": "testing" }}

        // transaction type
        { "term": { "transaction.type": "request" }}

        // event type (possible values : transaction, span, metric, error)
        { "terms": { "processor.event": ["metric"] }},

        // metric set is a subtype of `processor.event: metric`
        { "terms": { "metricset.name": ["transaction"] }},

        // time range
        {
          "range": {
            "@timestamp": {
              "gte": 1633000560000,
              "lte": 1633001498988,
              "format": "epoch_millis"
            }
          }
        }
      ]
    }
  },
```
