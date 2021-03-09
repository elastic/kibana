## Proposal: building Rule Execution Log on top of Event Log and ECS

### Overview

We're going to get rid of storing rule execution statuses and additional data in custom "sidecar" saved objects. Those are objects stored in `.kibana` index and having type = `siem-detection-engine-rule-status`. The corresponding SO attributes are:

```ts
export interface IRuleStatusSOAttributes extends Record<string, any> {
  alertId: string; // created alert id.
  statusDate: StatusDate;
  lastFailureAt: LastFailureAt | null | undefined;
  lastFailureMessage: LastFailureMessage | null | undefined;
  lastSuccessAt: LastSuccessAt | null | undefined;
  lastSuccessMessage: LastSuccessMessage | null | undefined;
  status: JobStatus | null | undefined;
  lastLookBackDate: string | null | undefined;
  gap: string | null | undefined;
  bulkCreateTimeDurations: string[] | null | undefined;
  searchAfterTimeDurations: string[] | null | undefined;
}
```

We're going to start using the Event Log ([`event_log`](https://github.com/elastic/kibana/tree/master/x-pack/plugins/event_log) plugin built by the Alerting team).

For more context, please read https://github.com/elastic/kibana/issues/91265#issuecomment-781363642

Regarding software design:

- We will be storing rule status updates and all the additional metrics data (search durations, gaps, etc) in event log during the rule execution.
- We will query event log on the Rule Details page to fetch the current execution status and the log itself. Eventually the idea is to have an "Execution Log" tab instead of "Failure History" and fetch let's say last 50 events of different types. We will be able to log generic info messages, generic errors/exceptions, add special types of events.
- We will query event log on the Rules Management page to render our rule management and monitoring tables. We will need to be able to aggregate log events to fetch M*N metrics of N rules in a single of a few queries (where M is the number of metrics we show, e.g. "Last gap", "Indexing time", etc).
- We will have 3 data models representing the "rule execution log":
  - an underlying ECS model for events stored in Event Log
  - a write model where we will have our rule execution events in terms of Detection Engine, mapping of these events to their ECS form, services to write them (something like Rule Execution Logger)
  - a read model where we will have our rule execution events in terms of app user (Rule Details page), aggregation results (Rules Monitoring table), services to read them
- Services will wrap the underlying Event Log.
- In the beginning, Rule Execution Logger (the writer) will be encapsulated in the `RuleStatusService`, and the only execution event we will have is a Status Changed event. That means the Detection Engine will stay mostly untouched. The idea is to reduce the amount of refactoring. The disadvantage is that time-wise events in the log might be written not exactly when they happen. We will probably address that later, when implementing enhancements in the UI ("Execution Log" tab), so that all the logged events can have precise timestamps and show when exactly any of the events happened. Also, we'll be able to split a single fat Status Changed event into separate dedicated events, and use the Status Changed event only for cases when the status actually needs to be changed.
- Each Status Changed event will be mapped to a series of ECS events.
- In our API route handlers we will replace requests to `siem-detection-engine-rule-status` saved objects with requests to the new rule execution log service (read model).
- Our API schema will not change, except later in order to show the full "Execution Log" instead of "Failure History" we might want to introduce a non-breaking change.

### What to review

Please take a look at the code submitted in this PR:

- `rule_execution_log/common_model` contains the ECS model of events for Event Log, common types and constants, a builder for creating ECS events for this particular log
- `rule_execution_log/write_model` contains the definition of rule execution events, `StatusChangedEvent` in particular, and mapping of it to a series of ECS events

Please check the ECS events we're going to store and queries we will need to execute. You can play with it in Kibana Dev Tools:

1. Use `dev_tools_index.txt` to create a test index. This file contains Elasticsearch index mappings for ECS version `1.9.0` (https://github.com/elastic/ecs/blob/1.9/generated/elasticsearch/7/template.json) adjusted with a custom mapping of `kibana.detection_engine` field.
2. Index events using `dev_tools_events.txt`. It contains ECS events as text that you can copy-paste into Kibana Dev Tools.
3. Run queries from `dev_tools_queries.txt`. It contains queries to event log index we will need to be able to execute.
4. Optionally, play with data in `generate_events.ts`. It transforms `StatusChangedEvent` to ECS events and writes them to `dev_tools_events.txt`. Run it with `node x-pack/plugins/security_solution/server/lib/detection_engine/rule_execution_log/generate_events.js`.

### What's missing in the current Event Log API

In short:

- extended support for ECS - more fields and field sets, in particular:
  - standard `event.*`, `log.*`, `rule.*`
  - custom `kibana.detection_engine.*`
- aggregation queries
- sorting by multiple fields
- nice-to-have: custom ES DSL filters (`term`, `terms`) instead of string KQL filter
- limiting source fields to return: `"_source": ["@timestamp", "message", "log.level", "event.action"]`

#### Extended support for ECS

In this proposal, I'm designing our rule execution log events using a few additional fields. These fields are not currently supported by Event Log.

```ts
interface IEcsAdditionalFields {
  // https://www.elastic.co/guide/en/ecs/1.9/ecs-event.html
  event?: {
    dataset?: string;
    created?: string;
    kind?: string;
    type?: string[];
    severity?: number;
    sequence?: number;
  };

  // https://www.elastic.co/guide/en/ecs/1.9/ecs-log.html
  log?: {
    logger?: string;
    level?: string;
  };

  // https://www.elastic.co/guide/en/ecs/1.9/ecs-rule.html
  rule?: {
    id?: string;
  };

  // custom fields
  kibana?: {
    detection_engine?: {
      rule_status?: string;
      rule_status_severity?: number;
    };
  };
}
```

My suggestion would be to add support for all the standard `event.*`, `log.*`, `rule.*` fields (at least these field sets), as well as for our custom `kibana.detection_engine.*` fields. If it's easy to add support for the whole ECS, I'd say let's do it.

It's not super clear to me how exactly we're gonna specify `kibana.detection_engine` both in terms of TypeScript API and ES mapping. Should it be delegated to Event Log's clients with some registration API rather than hardcoded in Event Log itself?

#### Aggregation queries

We need to be able to execute aggregation queries with arbitrary aggs, like for example specified in this example query:

```json
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "term": { "kibana.saved_objects.type": "alert" } },
        { "term": { "kibana.saved_objects.namespace": "some-space" } },
        {
          "terms": {
            "kibana.saved_objects.id": [
              "1234-56789-dfgdfhgfgh-122346567",
              "1234-56789-dfgdfhgfgh-122346568"
            ]
          }
        }
      ]
    }
  },
  "aggs": {
    "rules": {
      "terms": {
        "field": "kibana.saved_objects.id",
        "size": 2
      },
      "aggs": {
        "events_status_changed": {
          "filter": {
            "term": { "event.action": "status-changed" }
          },
          "aggs": {
            "last_item": {
              "top_hits": {
                "size": 1,
                "sort": [
                  { "@timestamp": { "order": "desc" } },
                  { "event.sequence": { "order": "desc" } }
                ],
                "_source": ["@timestamp", "kibana.detection_engine"]
              }
            }
          }
        },
        "metrics_execution_gap": {
          "filter": {
            "term": { "event.action": "metric-execution-gap" }
          },
          "aggs": {
            "last_item": {
              "top_hits": {
                "size": 1,
                "sort": [
                  { "@timestamp": { "order": "desc" } },
                  { "event.sequence": { "order": "desc" } }
                ],
                "_source": ["event.duration"]
              }
            }
          }
        },
        "metrics_search_duration_max": {
          "filter": {
            "term": { "event.action": "metric-search-duration-max" }
          },
          "aggs": {
            "last_item": {
              "top_hits": {
                "size": 1,
                "sort": [
                  { "@timestamp": { "order": "desc" } },
                  { "event.sequence": { "order": "desc" } }
                ],
                "_source": ["event.duration"]
              }
            }
          }
        },
        "metrics_indexing_duration_max": {
          "filter": {
            "term": { "event.action": "metric-indexing-duration-max" }
          },
          "aggs": {
            "last_item": {
              "top_hits": {
                "size": 1,
                "sort": [
                  { "@timestamp": { "order": "desc" } },
                  { "event.sequence": { "order": "desc" } }
                ],
                "_source": ["event.duration"]
              }
            }
          }
        },
        "metrics_indexing_lookback": {
          "filter": {
            "term": { "event.action": "metric-indexing-lookback" }
          },
          "aggs": {
            "last_item": {
              "top_hits": {
                "size": 1,
                "sort": [
                  { "@timestamp": { "order": "desc" } },
                  { "event.sequence": { "order": "desc" } }
                ],
                "_source": ["event.end"]
              }
            }
          }
        }
      }
    }
  }
}
```

We need a freedom to pack multiple aggs in a single query or to split it into several queries.

We'd also like to be able to combine aggs with top-level filters, pagination, sorting and other options if we need so. See pre-filtering with `"term": { "event.action": "status-changed" }`:

```json
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "term": { "kibana.saved_objects.type": "alert" } },
        { "term": { "kibana.saved_objects.namespace": "some-space" } },
        {
          "terms": {
            "kibana.saved_objects.id": [
              "1234-56789-dfgdfhgfgh-122346567",
              "1234-56789-dfgdfhgfgh-122346568"
            ]
          }
        },
        {
          "term": { "event.action": "status-changed" }
        }
      ]
    }
  },
  "aggs": {
    "rules": {
      "terms": {
        "field": "kibana.saved_objects.id",
        "size": 2
      },
      "aggs": {
        "current_status": {
          "top_hits": {
            "size": 1,
            "sort": [
              { "@timestamp": { "order": "desc" } },
              { "event.sequence": { "order": "desc" } }
            ],
            "_source": ["@timestamp", "kibana.detection_engine"]
          }
        }
      }
    }
  }
}
```

#### Sorting by multiple fields

The current API allows to specify only a single sort field and restricts the fields that can be used to sort events.

```ts
  sort_field: schema.oneOf(
    [
      schema.literal('@timestamp'),
      schema.literal('event.start'),
      schema.literal('event.end'),
      schema.literal('event.provider'),
      schema.literal('event.duration'),
      schema.literal('event.action'),
      schema.literal('message'),
    ],
    {
      defaultValue: '@timestamp',
    }
  ),
  sort_order: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
    defaultValue: 'asc',
  }),
```

We need to be able to sort by multiple fields both in normal queries and within an aggregation scope.

```json
"sort": [
    { "@timestamp": { "order": "desc" } },
    { "event.sequence": { "order": "desc" } }
  ]
```

In the future we will need to sort by arbitrary fields in order to implement, for example, sorting by the current rule execution status (`kibana.detection_engine.rule_status_severity`) in our rules monitoring table.

#### Custom ES DSL filters

Would be nice to have an option to specify custom filters with ES DSL, like for example here:

```json
"query": {
  "bool": {
    "filter": [
      { "term": { "kibana.saved_objects.type": "alert" } },
      { "term": { "kibana.saved_objects.namespace": "some-space" } },
      {
        "terms": {
          "kibana.saved_objects.id": [
            "1234-56789-dfgdfhgfgh-122346567",
            "1234-56789-dfgdfhgfgh-122346568"
          ]
        }
      },
      // This one would be a custom term filter:
      {
        "term": { "event.action": "status-changed" }
      }
    ]
  }
},
```

With the current API it's possible to specify a string KQL filter. It's definitely a great option to have, but in cases like this one, where we exactly know the resulting query to build, we'd prefer to save some server-side CPU cycles by not parsing KQL.

#### Limiting source fields to return

Sometimes we don't need to fetch the full event document with all its ECS fields. We need to be able to restrict the source fields as we like, both within aggs and the query scope:

```json
"aggs": {
  "last_item": {
    "top_hits": {
      "size": 1,
      "sort": [
        { "@timestamp": { "order": "desc" } },
        { "event.sequence": { "order": "desc" } }
      ],
      "_source": ["event.duration"]
    }
  }
}
```

```json
{
  "query": {...},
  "sort": [...],
  "_source": ["@timestamp", "message", "log.level", "event.severity", "event.action"]
}
```

### More questions about using Event Log

ECS version:

- Which version of ECS does the Event Log support? Is it strictly `1.6.0` or several versions can be supported at the same time for different clients?
- Who/when/how will upgrade the version(s) supported by Event Log?
- Should (or can) clients specify `ecs.version` when logging events?

ECS `event.provider`, `event.dataset`, `log.logger`:

- With the RAC project going on, our team will be extracting the Detection Engine into a separate plugin. There's a feeling that this plugin might grow over time accumulating all the common functionality.
- I felt like it would be nice to be able to specify `event.provider: 'detection-engine'`, but have a way to have multiple logs within the provider.
- In this proposal I'm using:
  - `event.dataset: 'detection-engine.rule-execution-log'`
  - `log.logger: 'detection-engine.rule-execution-log'`
- Similarly, we'd need to be able to query only `detection-engine.rule-execution-log` where needed, and not the full log.
- In this model, each logger/dataset would specify its own set of `event.action`s.
- Who should set `event.provider`, `event.dataset`, `log.logger` fields for an event - a client of `IEventLogger` or the logger itself?

Could we theoretically use an instance of `ElasticsearchClient` to query the event log index, rather than using `IEventLogClient`? My concern is: while writing to this index and managing the index should be done via dedicated APIs, adding read APIs can become a leaky abstraction, which reminds me of the issues we currently have with saved objects APIs like lack of aggs support etc. On the one hand, for us, application developers, it's hard to predict what read API we will need in the future; would be nice to have freedom to use any that Elasticsearch provides. On the other hand, adding support for all the APIs can be difficult and lead to maintenance issues. Maybe there's a way to provide a decorator on top of `ElasticsearchClient` that would preserve its API or a thin adapter that would just slightly change it?
