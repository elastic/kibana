# Index Lifecycle Management

## Quick steps for testing ILM in Index Management

You can test that the `Frozen` badge, phase filtering, and lifecycle information is surfaced in
Index Management by running this series of requests in Console:

```
PUT /_ilm/policy/full
{
  "policy": {
    "phases" : {
      "hot" : {
        "min_age" : "0ms",
        "actions" : {
          "rollover" : {
            "max_docs" : 1
          }
        }
      },
      "warm" : {
        "min_age" : "15s",
        "actions" : {
          "forcemerge" : {
            "max_num_segments" : 1
          },
          "shrink" : {
            "number_of_shards" : 1
          }
        }
      },
      "cold" : {
        "min_age" : "30s",
        "actions" : {
          "freeze": {}
        }
      },
      "delete" : {
        "min_age" : "1d",
        "actions" : {
          "delete" : { }
        }
      }
    }
  }
}

PUT _template/test
{
  "index_patterns": ["test-*"],
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 0,
    "index.lifecycle.name": "full",
    "index.lifecycle.rollover_alias": "test-alias"
  }
}

PUT /test-000001
{
  "aliases": {
    "test-alias": {
      "is_write_index": true
    }
  }
}

PUT test-alias/_doc/1
{
  "a": "a"
}

PUT /_cluster/settings
{
  "transient": {
    "logger.org.elasticsearch.xpack.core.indexlifecycle": "TRACE",
    "logger.org.elasticsearch.xpack.indexlifecycle": "TRACE",
    "logger.org.elasticsearch.xpack.core.ilm": "TRACE",
    "logger.org.elasticsearch.xpack.ilm": "TRACE",
    "indices.lifecycle.poll_interval": "10s"
  }
}
```

Then go into Index Management and, after about 1 minute, you'll see a frozen index and
you'll be able to filter by the various lifecycle phases and statuses.

![image](https://user-images.githubusercontent.com/1238659/78087831-29ee3180-7377-11ea-8e24-14cdc4035bb2.png)

Next, add the Kibana sample data and attach the `full` policy to the index that gets created.
After about a minute, there should be an error on this index. When you click the index you'll see
ILM information in the detail panel as well as an error. You can dismiss the error by clicking
`Manage > Retry lifecycle step`.

![image](https://user-images.githubusercontent.com/1238659/78087984-a6811000-7377-11ea-880e-1a7b182c14f1.png)