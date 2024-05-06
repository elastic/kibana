
# Version
|Version|Risk Score Entity|Scripts created|Ingest pipelines created|Transforms created|Behind feature flag|Notes|
|-------|------|-------|----------------|----------|----|----|
|8.3`deprecated`|host|1.ml_hostriskscore_levels_script_{spacename} 2.ml_hostriskscore_map_script_{spacename} 3.ml_hostriskscore_reduce_script_{spacename} 4.ml_hostriskscore_init_script_{spacename}|ml_hostriskscore_ingest_pipeline_{spacename}|1.ml_hostriskscore_pivot_transform_{spacename} Destination Index: `ml_host_risk_score_{spacename}` 2.ml_hostriskscore_latest_transform_{spacename} Destination Index: `ml_host_risk_score_latest_{spacename}`| Yes|https://github.com/elastic/detection-rules/blob/main/docs/experimental-machine-learning/host-risk-score.md|
|8.3`deprecated`|user|1.ml_userriskscore_levels_script_{spacename} 2.ml_userriskscore_map_script_{spacename} 3.ml_userriskscore_reduce_script_{spacename}|ml_userriskscore_ingest_pipeline_{spacename}|1.ml_userriskscore_pivot_transform_{spacename} Destination index: `ml_user_risk_score_{spacename}` 2.ml_userriskscore_latest_transform_{spacename} Destination index: `ml_user_risk_score_latest_{spacename}`|Yes|https://github.com/elastic/detection-rules/blob/main/docs/experimental-machine-learning/user-risk-score.md|
|8.4`deprecated`|host|1.ml_hostriskscore_levels_script 2.ml_hostriskscore_map_script 3.ml_hostriskscore_reduce_script 4.ml_hostriskscore_init_script|ml_hostriskscore_ingest_pipeline|1.ml_hostriskscore_pivot_transform_{spacename} Destination Index: `ml_host_risk_score_{spacename}` 2.ml_hostriskscore_latest_transform_{spacename} Destination Index: `ml_host_risk_score_latest_{spacename}`|Yes|Installation via dev tools releasesd. https://github.com/elastic/kibana/blob/8.4/x-pack/plugins/security_solution/server/lib/prebuilt_dev_tool_content/console_templates/enable_host_risk_score.console|
|8.4`deprecated`|user|1.ml_userriskscore_levels_script_{spacename} 2.ml_userriskscore_map_script_{spacename} 3.ml_userriskscore_reduce_script_{spacename}|ml_userriskscore_ingest_pipeline_{spacename}|1.ml_userriskscore_pivot_transform_{spacename} Destination index: `ml_user_risk_score_{spacename}` 2.ml_userriskscore_latest_transform_{spacename} Destination index: `ml_user_risk_score_latest_{spacename}`|Yes|Installation via dev tools not available yet (Installation via dev tools is availble in 8.5).
|8.5+|host|1.ml_hostriskscore_levels_script_{spacename} 2.ml_hostriskscore_map_script_{spacename} 3.ml_hostriskscore_reduce_script_{spacename} 4.ml_hostriskscore_init_script_{spacename}|ml_hostriskscore_ingest_pipeline_{spacename}|1.ml_hostriskscore_pivot_transform_{spacename} Destination Index: `ml_host_risk_score_{spacename}` 2.ml_hostriskscore_latest_transform_{spacename} Destination Index: `ml_host_risk_score_latest_{spacename}`| No|`Breaking Chang`: New schema for Destination indices|
|8.5+|user|1.ml_userriskscore_levels_script_{spacename} 2.ml_userriskscore_map_script_{spacename} 3.ml_userriskscore_reduce_script_{spacename}|ml_userriskscore_ingest_pipeline_{spacename}|1.ml_userriskscore_pivot_transform_{spacename} Destination index: `ml_user_risk_score_{spacename}` 2.ml_userriskscore_latest_transform_{spacename} Destination index: `ml_user_risk_score_latest_{spacename}`|No|`Breaking Chang`: New schema for Destination indices|
# Risk Score API

### API usage

#### 1. GET /internal/risk_score/index_status - `getRiskScoreIndexStatusRoute`
##### REQUEST:
```typescript
  GET /internal/risk_score/index_status
  {
    indexName: 'ml_host_risk_score_latest'
  }
```
##### RESPONSE:
```typescript
  {
      isDeprecated: boolean;
      isEnabled: boolean;
  }
```
##### This route is called from `useRiskScore` hook.

#### 2. PUT - /internal/risk_score/indices/create

example:
##### REQUEST:

```
PUT /internal/risk_score/indices/create
{
  "index": "ml_host_risk_score_latest_default-test",
  "mappings": {
      "properties": {
          "host.name": {
              "type": "keyword"
          },
          "@timestamp": {
              "type": "date"
          },
          "ingest_timestamp": {
              "type": "date"
          },
          "risk": {
              "type": "text",
              "fields": {
                  "keyword": {
                      "type": "keyword"
                  }
              }
          },
          "risk_stats": {
              "properties": {
                  "risk_score": {
                      "type": "float"
                  }
              }
          }
      }
    }
}
```


##### RESPONSE:
```
{
    "index": "ml_host_risk_score_latest_default-test",
    "mappings": {
        "properties": {
            "host.name": {
                "type": "keyword"
            },
            "@timestamp": {
                "type": "date"
            },
            "ingest_timestamp": {
                "type": "date"
            },
            "risk": {
                "type": "text",
                "fields": {
                    "keyword": {
                        "type": "keyword"
                    }
                }
            },
            "risk_stats": {
                "properties": {
                    "risk_score": {
                        "type": "float"
                    }
                }
            }
        }
    }
}
```

#### 3. POST - /internal/risk_score/indices/delete

example:

##### REQUEST:
```
  POST /internal/risk_score/indices/delete
  {
    "indices": ["ml_host_risk_score_latest_default-test"]
  }
```

##### RESPONSE:
```
  {
    "deleted": [
        "ml_host_risk_score_latest_default-test"
    ]
  }
```

#### 4. POST - /internal/risk_score

Onboard host or user risk score.
##### Option:

|Body|description|
|--|--|
|riskScoreEntity|value: `host` or `user`|

example:

##### REQUEST:
```
  POST /internal/risk_score
  {
    "riskScoreEntity": host
  }
```
##### RESPONSE:

```
[
    {
        "ml_hostriskscore_levels_script_default": {
            "success": true,
            "error": null
        }
    },
    {
        "ml_hostriskscore_ingest_pipeline_default": {
            "success": true,
            "error": null
        }
    },
    {
        "ml_hostriskscore_init_script_default": {
            "success": true,
            "error": null
        }
    },
    {
        "ml_hostriskscore_map_script_default": {
            "success": true,
            "error": null
        }
    },
    {
        "ml_hostriskscore_reduce_script_default": {
            "success": true,
            "error": null
        }
    },
    {
        "ml_host_risk_score_default": {
            "success": true,
            "error": null
        }
    },
    {
        "ml_host_risk_score_latest_default": {
            "success": true,
            "error": null
        }
    },
    {
        "ml_hostriskscore_pivot_transform_default": {
            "success": true,
            "error": null
        }
    },
    {
        "ml_hostriskscore_latest_transform_default": {
            "success": true,
            "error": null
        }
    }
]
```

#### 5. GET - /internal/risk_score/prebuilt_content/dev_tool/{console_id}

Get scripts for onboarding host or user risk score

##### Option:

|Param|description|
|--|--|
|console_id|value: `enable_host_risk_score` or `enable_user_risk_score`|

example:

##### REQUEST:

```
GET /internal/risk_score/prebuilt_content/dev_tool/enable_host_risk_score
```

##### RESPONSE:

```
# Click the run button of each step to enable the module
# Upload scripts
# 1. Script to assign risk level based on risk score
PUT _scripts/ml_hostriskscore_levels_script_default
{
"script": {
"lang": "painless",
"source": "double risk_score = (def)ctx.getByPath(params.risk_score);\nif (risk_score < 20) {\n
	ctx['host']['risk']['calculated_level']='Unknown' \n}\nelse if (risk_score>= 20 && risk_score < 40) {\n
		ctx['host']['risk']['calculated_level']='Low' \n}\nelse if (risk_score>= 40 && risk_score < 70) {\n
			ctx['host']['risk']['calculated_level']='Moderate' \n}\nelse if (risk_score>= 70 && risk_score < 90) {\n
				ctx['host']['risk']['calculated_level']='High' \n}\nelse if (risk_score>= 90) {\n
				ctx['host']['risk']['calculated_level'] = 'Critical'\n}"
				}
				}

				# 2. Script to setup initial state for the Host Risk Score scripted metric aggregation
				PUT _scripts/ml_hostriskscore_init_script_default
				{
				"script": {
				"lang": "painless",
				"source": "state.rule_risk_stats = new HashMap();\nstate.host_variant_set = false;\nstate.host_variant =
				new String();\nstate.tactic_ids = new HashSet();"
				}
				}

				# 3. Map script for the Host Risk Score transform
				PUT _scripts/ml_hostriskscore_map_script_default
				{
				"script": {
				"lang": "painless",
				"source": "// Get the host variant\nif (state.host_variant_set == false) {\n if
				(doc.containsKey(\"host.os.full\") && doc[\"host.os.full\"].size() != 0) {\n state.host_variant =
				doc[\"host.os.full\"].value;\n state.host_variant_set = true;\n }\n}\n// Aggregate all the tactics seen
				on the host\nif (doc.containsKey(\"signal.rule.threat.tactic.id\") &&
				doc[\"signal.rule.threat.tactic.id\"].size() != 0) {\n
				state.tactic_ids.add(doc[\"signal.rule.threat.tactic.id\"].value);\n}\n// Get running sum of
				time-decayed risk score per rule name per shard\nString rule_name =
				doc[\"signal.rule.name\"].value;\ndef stats = state.rule_risk_stats.getOrDefault(rule_name,
				[0.0,\"\",false]);\nint time_diff = (int)((System.currentTimeMillis() -
				doc[\"@timestamp\"].value.toInstant().toEpochMilli()) / (1000.0 * 60.0 * 60.0));\ndouble risk_derate =
				Math.min(1, Math.exp((params.lookback_time - time_diff) / params.time_decay_constant));\nstats[0] =
				Math.max(stats[0], doc[\"signal.rule.risk_score\"].value * risk_derate);\nif (stats[2] == false) {\n
				stats[1] = doc[\"kibana.alert.rule.uuid\"].value;\n stats[2] =
				true;\n}\nstate.rule_risk_stats.put(rule_name, stats);"
				}
				}

				# 4. Reduce script for the Host Risk Score transform
				PUT _scripts/ml_hostriskscore_reduce_script_default
				{
				"script": {
				"lang": "painless",
				"source": "// Consolidating time decayed risks and tactics from across all shards\nMap total_risk_stats
				= new HashMap();\nString host_variant = new String();\ndef tactic_ids = new HashSet();\nfor (state in
				states) {\n for (key in state.rule_risk_stats.keySet()) {\n def rule_stats =
				state.rule_risk_stats.get(key);\n def stats = total_risk_stats.getOrDefault(key, [0.0,\"\",false]);\n
				stats[0] = Math.max(stats[0], rule_stats[0]);\n if (stats[2] == false) {\n stats[1] = rule_stats[1];\n
				stats[2] = true;\n } \n total_risk_stats.put(key, stats);\n }\n if (host_variant.length() == 0) {\n
				host_variant = state.host_variant;\n }\n tactic_ids.addAll(state.tactic_ids);\n}\n// Consolidating
				individual rule risks and arranging them in decreasing order\nList risks = new ArrayList();\nfor (key in
				total_risk_stats.keySet()) {\n risks.add(total_risk_stats[key][0])\n}\nCollections.sort(risks,
				Collections.reverseOrder());\n// Calculating total host risk score\ndouble total_risk = 0.0;\ndouble
				risk_cap = params.max_risk * params.zeta_constant;\nfor (int i=0;i<risks.length;i++) {\n total_risk
					+=risks[i] / Math.pow((1+i), params.p);\n}\n// Normalizing the host risk score\ndouble
					total_norm_risk=100 * total_risk / risk_cap;\nif (total_norm_risk < 40) {\n total_norm_risk=2.125 *
					total_norm_risk;\n}\nelse if (total_norm_risk>= 40 && total_norm_risk < 50) {\n total_norm_risk=85 +
						(total_norm_risk - 40);\n}\nelse {\n total_norm_risk=95 + (total_norm_risk - 50) / 10;\n}\n//
						Calculating multipliers to the host risk score\ndouble risk_multiplier=1.0;\nList
						multipliers=new ArrayList();\n// Add a multiplier if host is a server\nif
						(host_variant.toLowerCase().contains(\"server\")) {\n risk_multiplier
						*=params.server_multiplier;\n multipliers.add(\"Host is a server\");\n}\n// Add multipliers
						based on number and diversity of tactics seen on the host\nfor (String tactic : tactic_ids) {\n
						multipliers.add(\"Tactic \"+tactic);\n risk_multiplier *=1 + params.tactic_base_multiplier *
						params.tactic_weights.getOrDefault(tactic, 0);\n}\n// Calculating final risk\ndouble
						final_risk=total_norm_risk;\nif (risk_multiplier> 1.0) {\n double prior_odds = (total_norm_risk)
						/ (100 - total_norm_risk);\n double updated_odds = prior_odds * risk_multiplier; \n final_risk =
						100 * updated_odds / (1 + updated_odds);\n}\n// Adding additional metadata\nList rule_stats =
						new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n Map temp = new HashMap();\n
						temp[\"rule_name\"] = key;\n temp[\"rule_risk\"] = total_risk_stats[key][0];\n temp[\"rule_id\"]
						= total_risk_stats[key][1];\n rule_stats.add(temp);\n}\n\nreturn [\"calculated_score_norm\":
						final_risk, \"rule_risks\": rule_stats, \"multipliers\": multipliers];"
						}
						}

						# 5. Upload the ingest pipeline
						# Ingest pipeline to add ingest timestamp and risk level to documents
						PUT _ingest/pipeline/ml_hostriskscore_ingest_pipeline_default
						{
						"processors":
						[{"set":{"field":"ingest_timestamp","value":"{{_ingest.timestamp}}"}},{"fingerprint":{"fields":["@timestamp","_id"],"method":"SHA-256","target_field":"_id"}},{"script":{"id":"ml_hostriskscore_levels_script_default","params":{"risk_score":"host.risk.calculated_score_norm"}}}]
						}

						# 6. Create mappings for the destination index of the Host Risk Score pivot transform
						PUT ml_host_risk_score_default
						{
						"mappings":
						{"properties":{"host":{"properties":{"name":{"type":"keyword"},"risk":{"properties":{"calculated_score_norm":{"type":"float"},"calculated_level":{"type":"keyword"},"multipliers":{"type":"keyword"},"rule_risks":{"properties":{"rule_name":{"type":"text","fields":{"keyword":{"type":"keyword"}}},"rule_risk":{"type":"float"},"rule_id":{"type":"keyword"}}}}}}},"ingest_timestamp":{"type":"date"},"@timestamp":{"type":"date"}}}
						}

						# 7. Upload the Host Risk Score pivot transform
						# This transform runs hourly and calculates a risk score and risk level for hosts in a Kibana
						space
						PUT _transform/ml_hostriskscore_pivot_transform_default
						{"dest":{"index":"ml_host_risk_score_default","pipeline":"ml_hostriskscore_ingest_pipeline_default"},"frequency":"1h","pivot":{"aggregations":{"@timestamp":{"max":{"field":"@timestamp"}},"host.risk":{"scripted_metric":{"combine_script":"return
						state","init_script":{"id":"ml_hostriskscore_init_script_default"},"map_script":{"id":"ml_hostriskscore_map_script_default"},"params":{"lookback_time":72,"max_risk":100,"p":1.5,"server_multiplier":1.5,"tactic_base_multiplier":0.25,"tactic_weights":{"TA0001":1,"TA0002":2,"TA0003":3,"TA0004":4,"TA0005":4,"TA0006":4,"TA0007":4,"TA0008":5,"TA0009":6,"TA0010":7,"TA0011":6,"TA0040":8,"TA0042":1,"TA0043":1},"time_decay_constant":6,"zeta_constant":2.612},"reduce_script":{"id":"ml_hostriskscore_reduce_script_default"}}}},"group_by":{"host.name":{"terms":{"field":"host.name"}}}},"source":{"index":[".alerts-security.alerts-default"],"query":{"bool":{"filter":[{"range":{"@timestamp":{"gte":"now-5d"}}}]}}},"sync":{"time":{"delay":"120s","field":"@timestamp"}}}


						# 8. Start the pivot transform
						POST _transform/ml_hostriskscore_pivot_transform_default/_start

						# 9. Create mappings for the destination index of the Host Risk Score latest transform
						PUT ml_host_risk_score_latest_default
						{
						"mappings":
						{"properties":{"host":{"properties":{"name":{"type":"keyword"},"risk":{"properties":{"calculated_score_norm":{"type":"float"},"calculated_level":{"type":"keyword"},"multipliers":{"type":"keyword"},"rule_risks":{"properties":{"rule_name":{"type":"text","fields":{"keyword":{"type":"keyword"}}},"rule_risk":{"type":"float"},"rule_id":{"type":"keyword"}}}}}}},"ingest_timestamp":{"type":"date"},"@timestamp":{"type":"date"}}}
						}

						# 10. Upload the latest transform
						# This transform gets the latest risk information about hosts in a Kibana space
						PUT _transform/ml_hostriskscore_latest_transform_default
						{"dest":{"index":"ml_host_risk_score_latest_default"},"frequency":"1h","latest":{"sort":"@timestamp","unique_key":["host.name"]},"source":{"index":["ml_host_risk_score_default"]},"sync":{"time":{"delay":"2s","field":"ingest_timestamp"}}}

						# 11. Start the latest transform
						POST _transform/ml_hostriskscore_latest_transform_default/_start

						# Hint: If you don't see data after running any of the transforms, stop and restart the
						transforms
						# Stop the pivot transform
						POST _transform/ml_hostriskscore_pivot_transform_default/_stop

						# Start the pivot transform
						POST _transform/ml_hostriskscore_pivot_transform_default/_start

						# Stop the latest transform
						POST _transform/ml_hostriskscore_latest_transform_default/_stop

						# Start the latest transform
						POST _transform/ml_hostriskscore_latest_transform_default/_start
```

#### 6. POST - /internal/risk_score/prebuilt_content/saved_objects/_bulk_create/{template_name}

Import saved objects for host or user risk score
##### Option:

|Param|description|
|--|--|
|template_name|value: `hostRiskScoreDashboards` or `userRiskScoreDashboards`|

example:

##### REQUEST:

```
POST /internal/risk_score/prebuilt_content/saved_objects/_bulk_create/hostRiskScoreDashboards
```

##### RESPONSE:

```
{
    "hostRiskScoreDashboards": {
        "success": true,
        "error": null,
        "body": [
            {
                "id": "259ef77a-0ea2-4ba2-bb77-f33fae4ec8aa",
                "type": "index-pattern",
                "title": "ml_host_risk_score_default"
            },
            {
                "id": "0adfc3b7-efa0-470e-ac31-27b1d8e01c48",
                "type": "lens",
                "title": "Host Risk Score (Max Risk Score Histogram)"
            },
            {
                "id": "e1a4d5f1-e59f-4ee6-918b-a1a1b48bf8de",
                "type": "index-pattern",
                "title": ".alerts-security.alerts-default"
            },
            {
                "id": "7799bfdf-9318-4f85-b840-678ccfbd9f79",
                "type": "visualization",
                "title": "Host Risk Score (Rule Breakdown)"
            },
            {
                "id": "acbc71e9-de52-47cd-ade6-33be0efdb1dc",
                "type": "visualization",
                "title": "Associated Users (Rule Breakdown)"
            },
            {
                "id": "0fb7224d-5e32-4f3d-b408-ee6acfd3f0c6",
                "type": "visualization",
                "title": "Host Risk Score (Tactic Breakdown)- Verbose"
            },
            {
                "id": "53e4c2cd-9f34-48dd-ab87-f48b8c5dec22",
                "type": "tag",
                "name": "experimental"
            },
            {
                "id": "2175ffc6-c53c-46ac-b15d-be9b849881ac",
                "type": "dashboard",
                "title": "Drilldown of Host Risk Score"
            },
            {
                "id": "d9d560b4-beed-4c27-9989-95187e64d79b",
                "type": "index-pattern",
                "title": "ml_host_risk_score_latest_default"
            },
            {
                "id": "927a8467-ccc6-4374-85a4-0aab6c1c0613",
                "type": "lens",
                "title": "Current Risk Score for Hosts"
            },
            {
                "id": "aa7acd4e-b4e1-4730-acac-f73992034b0d",
                "type": "dashboard",
                "title": "Current Risk Score for Hosts"
            }
        ]
    }
}
```

#### 7. POST - /internal/risk_score/prebuilt_content/saved_objects/_bulk_delete/{template_name}

Import saved objects for host or user risk score
##### Option:

|Param|description|
|--|--|
|template_name|value: `hostRiskScoreDashboards` or `userRiskScoreDashboards`|

example:

##### REQUEST:

```
POST /internal/risk_score/prebuilt_content/saved_objects/_bulk_delete/hostRiskScoreDashboards
```

##### RESPONSE:

```
[
    "Saved object [index-pattern/ml-host-risk-score-default-index-pattern] not found",
    "Saved object [lens/d3f72670-d3a0-11eb-bd37-7bb50422e346] not found",
    "Saved object [index-pattern/alerts-default-index-pattern] not found",
    "Saved object [visualization/42371d00-cf7a-11eb-9a96-05d89f94ad96] not found",
    "Saved object [visualization/a62d3ed0-cf92-11eb-a0ff-1763d16cbda7] not found",
    "Saved object [visualization/b2dbc9b0-cf94-11eb-bd37-7bb50422e346] not found",
    "Saved object [tag/1d00ebe0-f3b2-11eb-beb2-b91666445a94] not found",
    "Saved object [dashboard/6f05c8c0-cf77-11eb-9a96-05d89f94ad96] not found",
    "Saved object [index-pattern/ml-host-risk-score-latest-default-index-pattern] not found",
    "Saved object [lens/dc289c10-d4ff-11eb-a0ff-1763d16cbda7] not found",
    "Saved object [dashboard/27b483b0-d500-11eb-a0ff-1763d16cbda7] not found"
]
```