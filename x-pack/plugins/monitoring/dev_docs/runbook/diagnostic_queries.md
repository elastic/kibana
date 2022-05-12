If the stack monitoring UI isn't showing data for any cluster, it may first be useful to survey the available data using a query like this:

```Kibana Dev Tools
POST .monitoring-*/_search
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

The main cluster list requires ES cluster stats to be available. You can use this query to check for the presence of cluster stats for a given `CLUSTER_UUID` (note the replacement required in the query).

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