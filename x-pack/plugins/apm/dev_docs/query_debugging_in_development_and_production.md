# Elasticsearch query debugging (AKA Inspector)

When debugging an issue within APM UI it can be very helpful to see the exact Elasticsearch queries and responses that was made for a specific page. This can be achieved by enabling the Inspector:

1. Open APM UI
2. Click "Settings" (top right corner)
3. Click "General Settings" tab
4. Enable "Inspect ES queries" and click "Save"

You will now be able to navigate to any page in APM UI, and see a new button in the top-right corner called "Inspect". Clicking this will open a fly-out listing all the requests made to Elasticsearch.

![apm-inspect2](https://github.com/elastic/kibana/assets/209966/ba5ebad9-cecc-4ed8-b6c6-9ffc0ce14c6d)

## Inspecting specific http endpoints

It is also possible to see the Elasticsearch queries made for a specific http endpoint. Again, navigate to the page making the request, then open your browser's Developer Tools and select the http request of interest. There will be an `_inspect` key in the response containing every Elasticsearch query made during that request including both requests and responses to and from Elasticsearch.

![image](https://user-images.githubusercontent.com/209966/140500012-b075adf0-8401-40fd-99f8-85b68711de17.png)






<details>
  <summary>See example</summary>
  
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

</details>

