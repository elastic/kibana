If the stack monitoring UI isn't showing data for any cluster or missing key metrics, it may first be useful to survey the available data.

If troubleshooting a cluster with a version >= 8.3.1, the [Stack Monitoring health API](https://github.com/elastic/kibana/tree/main/x-pack/plugins/monitoring/server/routes/api/v1/_health) is the recommended way to get an overview of the available data and possible metrics collection issues.
The API is included in the [support-diagnostics utility](https://github.com/elastic/support-diagnostics) so if a bundle is provided in the issue you're working on, the API response would already be available in `kibana_stack_monitoring_health.json`. Otherwise, one can ask for the API response instead of the raw queries.

If troubleshooting an older version, the following queries would be good starters:

```Kibana Dev Tools
POST .monitoring-*,*:.monitoring-*,metrics-*,*:metrics-*/_search
{
  "size": 0,
  "query": {
    "range": {
      "timestamp": {
        "gte": "now-1h",
        "lte": "now"
      }
    }
  },
  "aggs": {
    "clusters": {
      "terms": {
        "field": "cluster_uuid",
        "missing": "__standalone_cluster__",
        "size": 100
      },
      "aggs": {
        "indices": {
          "terms": {
            "field": "_index",
            "size": 100
          },
          "aggs": {
            "types": {
              "terms": {
                "field": "type",
                "size": 100
              },
              "aggs": {
                "latest_timestamp": {
                  "max": {
                    "field": "timestamp"
                  }
                }
              }
            },
            "metricset_names": {
              "terms": {
                "field": "metricset.name",
                "size": 100
              },
              "aggs": {
                "latest_timestamp": {
                  "max": {
                    "field": "timestamp"
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

This will show what document types are available in each index for each cluster UUID in the last hour.

The main cluster list requires ES cluster stats to be available. You can use this query to check for the presence of cluster stats for a given cluster.

> **Note**
> `<CLUSTER UUID>` in the query below must be replaced with the elasticsearch cluster UUID. This is available from the `cluster_uuid` key of the `GET /` response.

```Kibana Dev Tools
POST .monitoring-*,*:.monitoring-*,metrics-*,*:metrics-*/_search
{
  "size": 10,
  "query": {
    "bool": {
      "filter": [
        {
          "bool": {
            "should": [
              {
                "term": {
                  "type": "cluster_stats"
                }
              },
              {
                "term": {
                  "metricset.name": "cluster_stats"
                }
              }
            ]
          }
        },
        {
          "term": {
            "cluster_uuid": "<CLUSTER UUID>"
          }
        },
        {
          "range": {
            "timestamp": {
              "format": "epoch_millis",
              "gte": "now-7d",
              "lte": "now"
            }
          }
        }
      ]
    }
  },
  "collapse": {
    "field": "cluster_uuid"
  },
  "sort": {
    "timestamp": {
      "order": "desc",
      "unmapped_type": "long"
    }
  }
}
```
