## Creating Frozen Data On Cloud

The following instructions assume you have a cluster set up on ECH with at least one frozen tier node. To test frozen locally, follow instructions in https://docs.elastic.dev/security-soution/analyst-experience-team/eng-prod/how-to/configure-local-frozen-tier instead. Note that results may differ locally since ECH puts frozen shards on logically separate nodes whereas locally everything is running on your machine.

This module provides utilities to quickly move data to the frozen tier for testing. The main API call that accomplishes this is `ilm.moveToStep`, however, there's setup that must be done first to make the index ready. The basic process to go from nothing to having data in frozen is:

0. Set `{"persistent": {"indices.lifecycle.poll_interval": "10s"}}` in the cluster settings. This setting is 10m by default, which makes it take a long time for indices to fully move to frozen.
1. Create an ILM policy with at least `hot` and `frozen` phases
2. Create an index template that uses the ILM policy from step 1 (ideally make it a data stream template)
3. Index documents into the index/datastream controlled by the index template from step 2
4. Rollover the index/datastream
5. Move the ...-000001 index that contains the documents we indexed to the next ILM step
6. Wait until the response from `GET <index/DS name>/_ilm/explain` shows `phase: frozen`, `step: complete`, and `action: complete` - there are ~5 steps/actions it will go through automatically while you wait. If you didn't set the poll_interval in step 0, each of these steps/actions will take at least 10 minutes. For small data sets, the step/action should change every 10 seconds.

As an example, dev tools commands below execute the steps above in order.

```
PUT /_cluster/settings
{
  "persistent": {
    "indices.lifecycle.poll_interval": "10s"
  }
}

GET /_cluster/settings

PUT _ilm/policy/my-lifecycle-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_primary_shard_size": "50gb"
          }
        }
      },
      "frozen": {
        "min_age": "0d",
        "actions": {
          "searchable_snapshot": {
            "snapshot_repository": "found-snapshots"
          }
        }
      }
    }
  }
}

PUT _component_template/my-mappings
{
  "template": {
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date",
          "format": "date_optional_time||epoch_millis"
        },
        "message": {
          "type": "wildcard"
        }
      }
    }
  },
  "_meta": {
    "description": "Mappings for @timestamp and message fields",
    "my-custom-meta-field": "More arbitrary metadata"
  }
}

# Creates a component template for index settings
PUT _component_template/my-settings
{
  "template": {
    "settings": {
      "index.lifecycle.name": "my-lifecycle-policy"
    }
  },
  "_meta": {
    "description": "Settings for ILM",
    "my-custom-meta-field": "More arbitrary metadata"
  }
}

PUT _index_template/my-index-template
{
  "index_patterns": ["my-data-stream*"],
  "data_stream": { },
  "composed_of": [ "my-mappings", "my-settings" ],
  "priority": 500,
  "_meta": {
    "description": "Template for my time series data",
    "my-custom-meta-field": "More arbitrary metadata"
  }
}

PUT my-data-stream/_bulk
{ "create":{ } }
{ "@timestamp": "2099-05-06T16:21:15.000Z", "message": "192.0.2.42 - - [06/May/2099:16:21:15 +0000] \"GET /images/bg.jpg HTTP/1.0\" 200 24736" }
{ "create":{ } }
{ "@timestamp": "2099-05-06T16:25:42.000Z", "message": "192.0.2.255 - - [06/May/2099:16:25:42 +0000] \"GET /favicon.ico HTTP/1.0\" 200 3638" }

POST my-data-stream/_rollover

// The `action` and `name` in the _ilm/move request below must match the `action` and `step` values from _ilm/explain - they'll probably be `rollover` and `check-rollover-ready` after rolling the index over, but if `_ilm/move` fails check and make sure the values match
GET my-data-stream/_ilm/explain

POST _ilm/move/.ds-my-data-stream-2024.10.22-000001
{
  "current_step": {
    "phase": "hot",
    "action": "rollover",
    "name": "check-rollover-ready"
  },
  "next_step": {
    "phase": "frozen"
  }
}

// Wait for `phase`, `action`, `step`, to be `frozen`, `complete`, `complete` respectively
GET my-data-stream/_ilm/explain
```
