### Table of Contents

- [Transactions](#transactions)
- [Transactions in service inventory page](#transactions-in-service-inventory-page)
- [System metrics](#system-metrics)
- [Span breakdown metrics](#span-breakdown-metrics)
- [Service destination metrics](#service-destination-metrics)
- [Common filters](#common-filters)

---

### Data model

Elastic APM agents capture different types of information from within their instrumented applications. These are known as events, and can be spans, transactions, errors, or metrics. You can find more information [here](https://www.elastic.co/guide/en/apm/get-started/current/apm-data-model.html).

### Running examples

You can run the example queries on the [edge cluster](https://edge-oblt.elastic.dev/) or any another cluster that contains APM data.

# Transactions

Transactions are stored in two different formats:

#### Individual transactions document

A single transaction event where `transaction.duration.us` is the latency.

```json
{
  "@timestamp": "2021-09-01T10:00:00.000Z",
  "processor.event": "transaction",
  "transaction.duration.us": 2000,
  "event.outcome": "success"
}
```

or

#### Aggregated (metric) document

A pre-aggregated document where `_doc_count` is the number of transaction events, and `transaction.duration.histogram` is the latency distribution.

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

You can find all the APM transaction fields [here](https://www.elastic.co/guide/en/apm/server/current/exported-fields-apm-transaction.html).

The decision to use aggregated transactions or not is determined in [`getSearchTransactionsEvents`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/server/lib/helpers/aggregated_transactions/index.ts#L53-L79) and then used to specify [the transaction index](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/server/lib/suggestions/get_suggestions.ts#L30-L32) and [the latency field](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/server/lib/alerts/chart_preview/get_transaction_duration.ts#L62-L65)

### Latency

Latency is the duration of a transaction. This can be calculated using transaction events or metric events (aggregated transactions).

Noteworthy fields: `transaction.duration.us`, `transaction.duration.histogram`

#### Transaction-based latency

```json
GET apm-*-transaction-*,traces-apm*/_search?terminate_after=1000
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
GET apm-*-metric-*,metrics-apm*/_search?terminate_after=1000
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

Please note: `metricset.name: transaction` was only recently introduced. To retain backwards compatability we still use the old filter `{ "exists": { "field": "transaction.duration.histogram" }}` when filtering for aggregated transactions ([see example](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/server/lib/helpers/aggregated_transactions/index.ts#L89-L95)).

### Throughput

Throughput is the number of transactions per minute. This can be calculated using transaction events or metric events (aggregated transactions).

Noteworthy fields: None (based on `doc_count`)

#### Transaction-based throughput

```json
GET apm-*-transaction-*,traces-apm*/_search?terminate_after=1000
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [{ "terms": { "processor.event": ["transaction"] } }]
    }
  },
  "aggs": {
    "timeseries": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "60s"
      },
      "aggs": {
        "throughput": {
          "rate": {
            "unit": "minute"
          }
        }
      }
    }
  }
}
```

#### Metric-based throughput

```json
GET apm-*-metric-*,metrics-apm*/_search?terminate_after=1000
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
    "timeseries": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "60s"
      },
      "aggs": {
        "throughput": {
          "rate": {
            "unit": "minute"
          }
        }
      }
    }
  }
}
```

### Failed transaction rate

Failed transaction rate is the number of transactions with `event.outcome=failure` per minute.
Noteworthy fields: `event.outcome`

#### Transaction-based failed transaction rate

```json
GET apm-*-transaction-*,traces-apm*/_search?terminate_after=1000
{
 "size": 0,
 "query": {
   "bool": {
     "filter": [{ "terms": { "processor.event": ["transaction"] } }]
   }
 },
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

#### Metric-based failed transaction rate

```json
GET apm-*-metric-*,metrics-apm*/_search?terminate_after=1000
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
    "outcomes": {
      "terms": {
        "field": "event.outcome",
        "include": ["failure", "success"]
      }
    }
  }
}
```

# Transactions in service inventory page

Service transaction metrics are aggregated metric documents that hold latency and throughput metrics pivoted by `service.name`, `service.environment` and `transaction.type`. Additionally, `agent.name` and `service.language.name` are included as metadata.

We use the response from the `GET /internal/apm/time_range_metadata` endpoint to determine what data source is available. Service transaction metrics docs, introduced in APM >= 8.7, is considered available if there is data before *and* within the current time range. This ensure the UI won't miss information shipped by APM < 8.7. For < 8.7 documents, availability is determined by whether there is data before the current time range, or no data at all before the current time range, but there is data within the current time range. This means that existing deployments will use transaction metrics right after upgrading (instead of using service transaction metrics and seeing a mostly blank screen), but also that new deployments immediately get the benefits of service transaction metrics, instead of falling all the way back to transaction events.

A pre-aggregated document where `_doc_count` is the number of transaction events

```
{
  "_doc_count": 4,
  "@timestamp": "2021-09-01T10:00:00.000Z",
  "processor.event": "metric",
  "metricset.name": "service_transaction",
  "metricset.interval": "1m",
  "service": {
    "environment": "production",
    "name": "web-go"
  },
  "transaction": {
    "duration.summary": {
        "sum": 1000,
        "value_count": 4
    },
    "duration.histogram": {
      "counts": [ 4 ],
      "values": [ 250 ]
    },
    "type": "request"
  },
  "event": {
    "success_count": {
      "sum": 1,
      "value_count": 2
    }
  }
}
```

- `_doc_count` is the number of bucket counts
- `transaction.duration.summary` is an [aggregate_metric_double](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/aggregate-metric-double.html) field and holds an aggregated transaction duration summary, for service transaction metrics
- `event.success_count` holds an aggregate metric double that describes the _success rate_. E.g., in this example, the success rate is 50% (1/2).

In addition to `service_transaction`, `service_summary` metrics are also generated. Every service outputs these, even when it does not record any transaction (that also means there is no transaction data on this metric). This means that we can use `service_summary` to display services without transactions, i.e. services that only have app/system metrics or errors.

### Latency

```
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [{ "term": { "metricset.name": "service" } }]
    }
  },
  "aggs": {
    "latency": { "avg": { "field": "transaction.duration.summary" }}
  }
}
```

# System metrics

System metrics are captured periodically (every 60 seconds by default). You can find all the System Metrics fields [here](https://www.elastic.co/guide/en/apm/server/current/exported-fields-system.html).

### CPU

![image](https://user-images.githubusercontent.com/209966/135990500-f85bd8d9-b5a5-4b7c-b9e1-0759eefb8a29.png)

Used in: [Metrics section](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/server/lib/metrics/by_agent/shared/cpu/index.ts#L83)

Noteworthy fields: `system.cpu.total.norm.pct`, `system.process.cpu.total.norm.pct`

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
GET apm-*-metric-*,metrics-apm*/_search?terminate_after=1000
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

![image](https://user-images.githubusercontent.com/209966/135990556-31716990-2812-46c3-a926-8c2a64c7c89f.png)

Noteworthy fields: `system.memory.actual.free`, `system.memory.total`,

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

```json
GET apm-*-metric-*,metrics-apm*/_search?terminate_after=1000
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "terms": { "processor.event": ["metric"] }},
        { "terms": { "metricset.name": ["app"] }},
        { "exists": { "field": "system.memory.actual.free" }},
        { "exists": { "field": "system.memory.total" }}
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

The above example is overly simplified. In reality [we do a bit more](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/server/lib/metrics/by_agent/shared/memory/index.ts#L51-L71) to properly calculate memory usage inside containers. Please note that an [Exists Query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-exists-query.html) is used in the filter context in the query to ensure that the memory fields exist.

# Span breakdown metrics

A pre-aggregations of span documents where `span.self_time.count` is the number of original spans. Measures the "self-time" for a span type, and optional subtype, within a transaction group.

Span breakdown metrics are used to power the "Time spent by span type" graph. Agents collect summarized metrics about the timings of spans, broken down by `span.type`.

![image](https://user-images.githubusercontent.com/209966/135990865-9077ae3e-a7a4-4b5d-bdce-41dc832689ea.png)

Used in: ["Time spent by span type" chart](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/server/lib/transactions/breakdown/index.ts#L48-L87)

Noteworthy fields: `transaction.name`, `transaction.type`, `span.type`, `span.subtype`, `span.self_time.*`

#### Sample document

```json
{
  "@timestamp": "2021-09-27T21:59:59.828Z",
  "processor.event": "metric",
  "metricset.name": "span_breakdown",
  "transaction.name": "GET /api/products",
  "transaction.type": "request",
  "span.self_time.sum.us": 1028,
  "span.self_time.count": 12,
  "span.type": "db",
  "span.subtype": "elasticsearch"
}
```

#### Query

```json
GET apm-*-metric-*,metrics-apm*/_search?terminate_after=1000
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
These metrics measure the count and total duration of requests from one service to another service.

![image](https://user-images.githubusercontent.com/209966/135990117-170070da-2fc5-4014-a597-0dda0970854c.png)

Used in: [Dependencies (latency)](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/server/lib/backends/get_latency_charts_for_backend.ts#L68-L79), [Dependencies (throughput)](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/server/lib/backends/get_throughput_charts_for_backend.ts#L67-L74) and [Service Map](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/server/lib/service_map/get_service_map_backend_node_info.ts#L57-L67)

Noteworthy fields: `span.destination.service.*`

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
GET apm-*-metric-*,metrics-apm*/_search?terminate_after=1000
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
GET apm-*-metric-*,metrics-apm*/_search?terminate_after=1000
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
    "timeseries": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "60s"
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
  }
}
```

# Common filters

Most Elasticsearch queries will need to have one or more filters. There are a couple of reasons for adding filters:

- correctness: Running an aggregation on unrelated documents will produce incorrect results
- stability: Running an aggregation on unrelated documents could cause the entire query to fail
- performance: limiting the number of documents will make the query faster

```json
GET apm-*-metric-*,metrics-apm*/_search?terminate_after=1000
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "service.name": "opbeans-go" }},
        { "term": { "service.environment": "testing" }},
        { "term": { "transaction.type": "request" }},
        { "terms": { "processor.event": ["metric"] }},
        { "terms": { "metricset.name": ["transaction"] }},
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
  }
}
```

Possible values for `processor.event` are: `transaction`, `span`, `metric`, `error`.

`metricset` is a subtype of `processor.event: metric`. Possible values are: `transaction`, `span_breakdown`, `transaction_breakdown`, `app`, `service_destination`, `agent_config`
