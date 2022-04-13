# Query Debugging

When debugging an issue with the APM UI it can be very helpful to see the exact Elasticsearch queries and responses that was made for a given API request.
To enable debugging of Elasticsearch queries in APM UI do the following:

1. Go to "Stack Management"
2. Under "Kibana" on the left-hand side, select "Advanced Settings"
3. Search for "Observability"
4. Enable "Inspect ES queries" setting
5. Click "Save"

When you navigate back to APM UI you can now inspect Elasticsearch queries by opening your browser's Developer Tools and selecting an api request to APM's api.
There will be an `_inspect` key containing every Elasticsearch query made during that request including both requests and responses to and from Elasticsearch.

![image](https://user-images.githubusercontent.com/209966/140500012-b075adf0-8401-40fd-99f8-85b68711de17.png)

## Example

When "Inspect ES queries" are enabed all API calls to the APM API will be include the query param `_inspect=true`. For the environments API the request / response will be:

```
GET /internal/apm/environments?start=<start>&end=<end>&_inspect=true
```

```json
{
  "environments": ["production", "testing", "ENVIRONMENT_NOT_DEFINED"],
  "_inspect": [
    {
      "id": "get_environments (/internal/apm/environments)",
      "json": {
        "size": 0,
        "query": {
          "bool": {
            "filter": [
              {
                "range": {
                  "@timestamp": {
                    "gte": 1636918740000,
                    "lte": 1636919672329,
                    "format": "epoch_millis"
                  }
                }
              },
              {
                "terms": {
                  "processor.event": ["transaction", "metric", "error"]
                }
              }
            ]
          }
        },
        "aggs": {
          "environments": {
            "terms": {
              "field": "service.environment",
              "missing": "ENVIRONMENT_NOT_DEFINED",
              "size": 100
            }
          }
        }
      },
      "name": "get_environments (/internal/apm/environments)",
      "response": {
        "json": {
          "took": 10,
          "timed_out": false,
          "_shards": {
            "total": 17,
            "successful": 17,
            "skipped": 0,
            "failed": 0
          },
          "hits": {
            "total": {
              "value": 10000,
              "relation": "gte"
            },
            "max_score": null,
            "hits": []
          },
          "aggregations": {
            "environments": {
              "doc_count_error_upper_bound": 0,
              "sum_other_doc_count": 0,
              "buckets": [
                {
                  "key": "production",
                  "doc_count": 27643
                },
                {
                  "key": "testing",
                  "doc_count": 960
                },
                {
                  "key": "ENVIRONMENT_NOT_DEFINED",
                  "doc_count": 63
                }
              ]
            }
          }
        }
      },
      "startTime": 1636919683285,
      "stats": {
        "kibanaApiQueryParameters": {
          "label": "Kibana API query parameters",
          "description": "The query parameters used in the Kibana API request that initiated the Elasticsearch request.",
          "value": "{\n  \"start\": \"2021-11-14T19:39:00.000Z\",\n  \"end\": \"2021-11-14T19:54:32.329Z\",\n  \"_inspect\": \"true\"\n}"
        },
        "kibanaApiRoute": {
          "label": "Kibana API route",
          "description": "The route of the Kibana API request that initiated the Elasticsearch request.",
          "value": "GET /internal/apm/environments"
        },
        "indexPattern": {
          "label": "Index pattern",
          "value": [
            "traces-apm*,apm-*",
            "metrics-apm*,apm-*",
            "logs-apm*,apm-*"
          ],
          "description": "The index pattern that connected to the Elasticsearch indices."
        },
        "hits": {
          "label": "Hits",
          "value": "0",
          "description": "The number of documents returned by the query."
        },
        "queryTime": {
          "label": "Query time",
          "value": "10ms",
          "description": "The time it took to process the query. Does not include the time to send the request or parse it in the browser."
        },
        "hitsTotal": {
          "label": "Hits (total)",
          "value": "> 10000",
          "description": "The number of documents that match the query."
        }
      },
      "status": 1
    }
  ]
}
```
