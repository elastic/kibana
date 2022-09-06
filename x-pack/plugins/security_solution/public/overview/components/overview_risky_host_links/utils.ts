/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getCreateIngestPipelineOptions = () => ({
  name: 'ml_hostriskscore_ingest_pipeline',
  processors: [
    {
      set: {
        field: 'ingest_timestamp',
        value: '{{_ingest.timestamp}}',
      },
    },
    {
      fingerprint: {
        fields: ['@timestamp', '_id'],
        method: 'SHA-256',
        target_field: '_id',
      },
    },
    {
      script: {
        id: 'ml_hostriskscore_levels_script',
        params: {
          risk_score: 'risk_stats.risk_score',
        },
      },
    },
  ],
});

export const getCreateMLHostRiskScoreIndicesOptions = ({
  spaceId = 'default',
}: {
  spaceId?: string;
}) => ({
  index: `ml_host_risk_score_${spaceId}`,
  mappings: {
    properties: {
      'host.name': {
        type: 'keyword',
      },
      '@timestamp': {
        type: 'date',
      },
      ingest_timestamp: {
        type: 'date',
      },
      risk: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      risk_stats: {
        properties: {
          risk_score: {
            type: 'float',
          },
        },
      },
    },
  },
});

export const getCreateMLHostRiskScoreLatestIndicesOptions = ({
  spaceId = 'default',
}: {
  spaceId?: string;
}) => ({
  index: `ml_host_risk_score_latest_${spaceId}`,
  mappings: {
    properties: {
      'host.name': {
        type: 'keyword',
      },
      '@timestamp': {
        type: 'date',
      },
      ingest_timestamp: {
        type: 'date',
      },
      risk: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      risk_stats: {
        properties: {
          risk_score: {
            type: 'float',
          },
        },
      },
    },
  },
});

export const getCreatePivaTransformOptions = ({ spaceId = 'default' }: { spaceId?: string }) => ({
  dest: {
    index: `ml_host_risk_score_${spaceId}`,
    pipeline: 'ml_hostriskscore_ingest_pipeline',
  },
  frequency: '1h',
  pivot: {
    aggregations: {
      '@timestamp': {
        max: {
          field: '@timestamp',
        },
      },
      risk_stats: {
        scripted_metric: {
          combine_script: 'return state',
          init_script: {
            source:
              'state.rule_risk_stats = new HashMap();\nstate.host_variant_set = false;\nstate.host_variant = new String();\nstate.tactic_ids = new HashSet();',
          },
          map_script: {
            source:
              '// Get the host variant\nif (state.host_variant_set == false) {\n    if (doc.containsKey("host.os.full") && doc["host.os.full"].size() != 0) {\n        state.host_variant = doc["host.os.full"].value;\n        state.host_variant_set = true;\n    }\n}\n// Aggregate all the tactics seen on the host\nif (doc.containsKey("signal.rule.threat.tactic.id") && doc["signal.rule.threat.tactic.id"].size() != 0) {\n    state.tactic_ids.add(doc["signal.rule.threat.tactic.id"].value);\n}\n// Get running sum of time-decayed risk score per rule name per shard\nString rule_name = doc["signal.rule.name"].value;\ndef stats = state.rule_risk_stats.getOrDefault(rule_name, [0.0,"",false]);\nint time_diff = (int)((System.currentTimeMillis() - doc["@timestamp"].value.toInstant().toEpochMilli()) / (1000.0 * 60.0 * 60.0));\ndouble risk_derate = Math.min(1, Math.exp((params.lookback_time - time_diff) / params.time_decay_constant));\nstats[0] = Math.max(stats[0], doc["signal.rule.risk_score"].value * risk_derate);\nif (stats[2] == false) {\n    stats[1] = doc["kibana.alert.rule.uuid"].value;\n    stats[2] = true;\n}\nstate.rule_risk_stats.put(rule_name, stats);',
          },
          params: {
            lookback_time: 72,
            max_risk: 100,
            p: 1.5,
            server_multiplier: 1.5,
            tactic_base_multiplier: 0.25,
            tactic_weights: {
              TA0001: 1,
              TA0002: 2,
              TA0003: 3,
              TA0004: 4,
              TA0005: 4,
              TA0006: 4,
              TA0007: 4,
              TA0008: 5,
              TA0009: 6,
              TA0010: 7,
              TA0011: 6,
              TA0040: 8,
              TA0042: 1,
              TA0043: 1,
            },
            time_decay_constant: 6,
            zeta_constant: 2.612,
          },
          reduce_script: {
            source:
              '// Consolidating time decayed risks and tactics from across all shards\nMap total_risk_stats = new HashMap();\nString host_variant = new String();\ndef tactic_ids = new HashSet();\nfor (state in states) {\n    for (key in state.rule_risk_stats.keySet()) {\n        def rule_stats = state.rule_risk_stats.get(key);\n        def stats = total_risk_stats.getOrDefault(key, [0.0,"",false]);\n        stats[0] = Math.max(stats[0], rule_stats[0]);\n        if (stats[2] == false) {\n            stats[1] = rule_stats[1];\n            stats[2] = true;\n        } \n        total_risk_stats.put(key, stats);\n    }\n    if (host_variant.length() == 0) {\n        host_variant = state.host_variant;\n    }\n    tactic_ids.addAll(state.tactic_ids);\n}\n// Consolidating individual rule risks and arranging them in decreasing order\nList risks = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n    risks.add(total_risk_stats[key][0])\n}\nCollections.sort(risks, Collections.reverseOrder());\n// Calculating total host risk score\ndouble total_risk = 0.0;\ndouble risk_cap = params.max_risk * params.zeta_constant;\nfor (int i=0;i<risks.length;i++) {\n    total_risk += risks[i] / Math.pow((1+i), params.p);\n}\n// Normalizing the host risk score\ndouble total_norm_risk = 100 * total_risk / risk_cap;\nif (total_norm_risk < 40) {\n    total_norm_risk =  2.125 * total_norm_risk;\n}\nelse if (total_norm_risk >= 40 && total_norm_risk < 50) {\n    total_norm_risk = 85 + (total_norm_risk - 40);\n}\nelse {\n    total_norm_risk = 95 + (total_norm_risk - 50) / 10;\n}\n// Calculating multipliers to the host risk score\ndouble risk_multiplier = 1.0;\nList multipliers = new ArrayList();\n// Add a multiplier if host is a server\nif (host_variant.toLowerCase().contains("server")) {\n    risk_multiplier *= params.server_multiplier;\n    multipliers.add("Host is a server");\n}\n// Add multipliers based on number and diversity of tactics seen on the host\nfor (String tactic : tactic_ids) {\n    multipliers.add("Tactic "+tactic);\n    risk_multiplier *= 1 + params.tactic_base_multiplier * params.tactic_weights.getOrDefault(tactic, 0);\n}\n// Calculating final risk\ndouble final_risk = total_norm_risk;\nif (risk_multiplier > 1.0) {\n    double prior_odds = (total_norm_risk) / (100 - total_norm_risk);\n    double updated_odds = prior_odds * risk_multiplier; \n    final_risk = 100 * updated_odds / (1 + updated_odds);\n}\n// Adding additional metadata\nList rule_stats = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n    Map temp = new HashMap();\n    temp["rule_name"] = key;\n    temp["rule_risk"] = total_risk_stats[key][0];\n    temp["rule_id"] = total_risk_stats[key][1];\n    rule_stats.add(temp);\n}\n\nreturn ["risk_score": final_risk, "rule_risks": rule_stats, "risk_multipliers": multipliers];',
          },
        },
      },
    },
    group_by: {
      'host.name': {
        terms: {
          field: 'host.name',
        },
      },
    },
  },
  source: {
    index: [`.alerts-security.alerts-${spaceId}`],
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: 'now-5d',
              },
            },
          },
        ],
      },
    },
  },
  sync: {
    time: {
      delay: '120s',
      field: '@timestamp',
    },
  },
});

export const getCreateLatestTransformOptions = ({ spaceId = 'default' }: { spaceId?: string }) => ({
  dest: {
    index: `ml_host_risk_score_latest_${spaceId}`,
  },
  frequency: '1h',
  latest: {
    sort: '@timestamp',
    unique_key: ['host.name'],
  },
  source: {
    index: [`ml_host_risk_score_${spaceId}`],
  },
  sync: {
    time: {
      delay: '2s',
      field: 'ingest_timestamp',
    },
  },
});
