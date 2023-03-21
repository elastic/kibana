/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ALERTS_INDEX } from '../constants';
import { RiskScoreEntity, RiskScoreFields } from '../search_strategy';
import type { Pipeline, Processor } from '../types/risk_scores';

/**
 * Aside from 8.4, all the transforms, scripts,
 * and ingest pipelines (and dashboard saved objects) are created with spaceId
 * so they won't affect each other across different spaces.
 */
export const getRiskScorePivotTransformId = (
  riskScoreEntity: RiskScoreEntity,
  spaceId = 'default'
) => `ml_${riskScoreEntity}riskscore_pivot_transform_${spaceId}`;

export const getRiskScoreLatestTransformId = (
  riskScoreEntity: RiskScoreEntity,
  spaceId = 'default'
) => `ml_${riskScoreEntity}riskscore_latest_transform_${spaceId}`;

export const getIngestPipelineName = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_ingest_pipeline_${spaceId}`;

export const getPivotTransformIndex = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}_risk_score_${spaceId}`;

export const getLatestTransformIndex = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}_risk_score_latest_${spaceId}`;

export const getAlertsIndex = (spaceId = 'default') => `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

export const getRiskScoreLevelScriptId = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_levels_script_${spaceId}`;
export const getRiskScoreInitScriptId = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_init_script_${spaceId}`;
export const getRiskScoreMapScriptId = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_map_script_${spaceId}`;
export const getRiskScoreReduceScriptId = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_reduce_script_${spaceId}`;

/**
 * These scripts and Ingest pipeline were not space aware in 8.4
 * They were shared across spaces and therefore affected each other.
 * New scripts and ingest pipeline are all independent in each space, so these ids
 * are Deprecated.
 * But We still need to keep track of the old ids, so we can delete them during upgrade.
 */
export const getLegacyIngestPipelineName = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_ingest_pipeline`;
export const getLegacyRiskScoreLevelScriptId = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_levels_script`;
export const getLegacyRiskScoreInitScriptId = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_init_script`;
export const getLegacyRiskScoreMapScriptId = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_map_script`;
export const getLegacyRiskScoreReduceScriptId = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_reduce_script`;

/**
 * This should be aligned with
 * console_templates/enable_host_risk_score.console step 1
 */
export const getRiskHostCreateLevelScriptOptions = (
  spaceId = 'default',
  stringifyScript?: boolean
) => {
  const source =
    "double risk_score = (def)ctx.getByPath(params.risk_score);\nif (risk_score < 20) {\n    ctx['host']['risk']['calculated_level'] = 'Unknown'\n}\nelse if (risk_score >= 20 && risk_score < 40) {\n    ctx['host']['risk']['calculated_level'] = 'Low'\n}\nelse if (risk_score >= 40 && risk_score < 70) {\n    ctx['host']['risk']['calculated_level'] = 'Moderate'\n}\nelse if (risk_score >= 70 && risk_score < 90) {\n    ctx['host']['risk']['calculated_level'] = 'High'\n}\nelse if (risk_score >= 90) {\n    ctx['host']['risk']['calculated_level'] = 'Critical'\n}";
  return {
    id: getRiskScoreLevelScriptId(RiskScoreEntity.host, spaceId),
    script: {
      lang: 'painless',
      source: stringifyScript ? JSON.stringify(source) : source,
    },
  };
};

/**
 * This should be aligned with
 * console_templates/enable_host_risk_score.console step 2
 */
export const getRiskHostCreateInitScriptOptions = (
  spaceId = 'default',
  stringifyScript?: boolean
) => {
  const source =
    'state.rule_risk_stats = new HashMap();\nstate.host_variant_set = false;\nstate.host_variant = new String();\nstate.tactic_ids = new HashSet();';
  return {
    id: getRiskScoreInitScriptId(RiskScoreEntity.host, spaceId),
    script: {
      lang: 'painless',
      source: stringifyScript ? JSON.stringify(source) : source,
    },
  };
};

/**
 * This should be aligned with
 * console_templates/enable_host_risk_score.console step 3
 */
export const getRiskHostCreateMapScriptOptions = (
  spaceId = 'default',
  stringifyScript?: boolean
) => {
  const source =
    '// Get the host variant\nif (state.host_variant_set == false) {\n    if (doc.containsKey("host.os.full") && doc["host.os.full"].size() != 0) {\n        state.host_variant = doc["host.os.full"].value;\n        state.host_variant_set = true;\n    }\n}\n// Aggregate all the tactics seen on the host\nif (doc.containsKey("signal.rule.threat.tactic.id") && doc["signal.rule.threat.tactic.id"].size() != 0) {\n    state.tactic_ids.add(doc["signal.rule.threat.tactic.id"].value);\n}\n// Get running sum of time-decayed risk score per rule name per shard\nString rule_name = doc["signal.rule.name"].value;\ndef stats = state.rule_risk_stats.getOrDefault(rule_name, [0.0,"",false]);\nint time_diff = (int)((System.currentTimeMillis() - doc["@timestamp"].value.toInstant().toEpochMilli()) / (1000.0 * 60.0 * 60.0));\ndouble risk_derate = Math.min(1, Math.exp((params.lookback_time - time_diff) / params.time_decay_constant));\nstats[0] = Math.max(stats[0], doc["signal.rule.risk_score"].value * risk_derate);\nif (stats[2] == false) {\n    stats[1] = doc["kibana.alert.rule.uuid"].value;\n    stats[2] = true;\n}\nstate.rule_risk_stats.put(rule_name, stats);';
  return {
    id: getRiskScoreMapScriptId(RiskScoreEntity.host, spaceId),
    script: {
      lang: 'painless',
      source: stringifyScript ? JSON.stringify(source) : source,
    },
  };
};

/**
 * This should be aligned with
 * console_templates/enable_host_risk_score.console step 4
 */
export const getRiskHostCreateReduceScriptOptions = (
  spaceId = 'default',
  stringifyScript?: boolean
) => {
  const source =
    '// Consolidating time decayed risks and tactics from across all shards\nMap total_risk_stats = new HashMap();\nString host_variant = new String();\ndef tactic_ids = new HashSet();\nfor (state in states) {\n    for (key in state.rule_risk_stats.keySet()) {\n        def rule_stats = state.rule_risk_stats.get(key);\n        def stats = total_risk_stats.getOrDefault(key, [0.0,"",false]);\n        stats[0] = Math.max(stats[0], rule_stats[0]);\n        if (stats[2] == false) {\n            stats[1] = rule_stats[1];\n            stats[2] = true;\n        } \n        total_risk_stats.put(key, stats);\n    }\n    if (host_variant.length() == 0) {\n        host_variant = state.host_variant;\n    }\n    tactic_ids.addAll(state.tactic_ids);\n}\n// Consolidating individual rule risks and arranging them in decreasing order\nList risks = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n    risks.add(total_risk_stats[key][0])\n}\nCollections.sort(risks, Collections.reverseOrder());\n// Calculating total host risk score\ndouble total_risk = 0.0;\ndouble risk_cap = params.max_risk * params.zeta_constant;\nfor (int i=0;i<risks.length;i++) {\n    total_risk += risks[i] / Math.pow((1+i), params.p);\n}\n// Normalizing the host risk score\ndouble total_norm_risk = 100 * total_risk / risk_cap;\nif (total_norm_risk < 40) {\n    total_norm_risk =  2.125 * total_norm_risk;\n}\nelse if (total_norm_risk >= 40 && total_norm_risk < 50) {\n    total_norm_risk = 85 + (total_norm_risk - 40);\n}\nelse {\n    total_norm_risk = 95 + (total_norm_risk - 50) / 10;\n}\n// Calculating multipliers to the host risk score\ndouble risk_multiplier = 1.0;\nList multipliers = new ArrayList();\n// Add a multiplier if host is a server\nif (host_variant.toLowerCase().contains("server")) {\n    risk_multiplier *= params.server_multiplier;\n    multipliers.add("Host is a server");\n}\n// Add multipliers based on number and diversity of tactics seen on the host\nfor (String tactic : tactic_ids) {\n    multipliers.add("Tactic "+tactic);\n    risk_multiplier *= 1 + params.tactic_base_multiplier * params.tactic_weights.getOrDefault(tactic, 0);\n}\n// Calculating final risk\ndouble final_risk = total_norm_risk;\nif (risk_multiplier > 1.0) {\n    double prior_odds = (total_norm_risk) / (100 - total_norm_risk);\n    double updated_odds = prior_odds * risk_multiplier; \n    final_risk = 100 * updated_odds / (1 + updated_odds);\n}\n// Adding additional metadata\nList rule_stats = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n    Map temp = new HashMap();\n    temp["rule_name"] = key;\n    temp["rule_risk"] = total_risk_stats[key][0];\n    temp["rule_id"] = total_risk_stats[key][1];\n    rule_stats.add(temp);\n}\n\nreturn ["calculated_score_norm": final_risk, "rule_risks": rule_stats, "multipliers": multipliers];';
  return {
    id: getRiskScoreReduceScriptId(RiskScoreEntity.host, spaceId),
    script: {
      lang: 'painless',
      source: stringifyScript ? JSON.stringify(source) : source,
    },
  };
};

/**
 * This should be aligned with
 * console_templates/enable_user_risk_score.console step 1
 */
export const getRiskUserCreateLevelScriptOptions = (
  spaceId = 'default',
  stringifyScript?: boolean
) => {
  const source =
    "double risk_score = (def)ctx.getByPath(params.risk_score);\nif (risk_score < 20) {\n  ctx['user']['risk']['calculated_level'] = 'Unknown'\n}\nelse if (risk_score >= 20 && risk_score < 40) {\n  ctx['user']['risk']['calculated_level'] = 'Low'\n}\nelse if (risk_score >= 40 && risk_score < 70) {\n  ctx['user']['risk']['calculated_level'] = 'Moderate'\n}\nelse if (risk_score >= 70 && risk_score < 90) {\n  ctx['user']['risk']['calculated_level'] = 'High'\n}\nelse if (risk_score >= 90) {\n  ctx['user']['risk']['calculated_level'] = 'Critical'\n}";
  return {
    id: getRiskScoreLevelScriptId(RiskScoreEntity.user, spaceId),
    script: {
      lang: 'painless',
      source: stringifyScript ? JSON.stringify(source) : source,
    },
  };
};

/**
 * This should be aligned with
 * console_templates/enable_user_risk_score.console step 2
 */
export const getRiskUserCreateMapScriptOptions = (
  spaceId = 'default',
  stringifyScript?: boolean
) => {
  const source =
    '// Get running sum of risk score per rule name per shard\\\\\nString rule_name = doc["signal.rule.name"].value;\ndef stats = state.rule_risk_stats.getOrDefault(rule_name, 0.0);\nstats = doc["signal.rule.risk_score"].value;\nstate.rule_risk_stats.put(rule_name, stats);';
  return {
    id: getRiskScoreMapScriptId(RiskScoreEntity.user, spaceId),
    script: {
      lang: 'painless',
      source: stringifyScript ? JSON.stringify(source) : source,
    },
  };
};

/**
 * This should be aligned with
 * console_templates/enable_user_risk_score.console step 3
 */
export const getRiskUserCreateReduceScriptOptions = (
  spaceId = 'default',
  stringifyScript?: boolean
) => {
  const source =
    '// Consolidating time decayed risks from across all shards\nMap total_risk_stats = new HashMap();\nfor (state in states) {\n    for (key in state.rule_risk_stats.keySet()) {\n    def rule_stats = state.rule_risk_stats.get(key);\n    def stats = total_risk_stats.getOrDefault(key, 0.0);\n    stats = rule_stats;\n    total_risk_stats.put(key, stats);\n    }\n}\n// Consolidating individual rule risks and arranging them in decreasing order\nList risks = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n    risks.add(total_risk_stats[key])\n}\nCollections.sort(risks, Collections.reverseOrder());\n// Calculating total risk and normalizing it to a range\ndouble total_risk = 0.0;\ndouble risk_cap = params.max_risk * params.zeta_constant;\nfor (int i=0;i<risks.length;i++) {\n    total_risk += risks[i] / Math.pow((1+i), params.p);\n}\ndouble total_norm_risk = 100 * total_risk / risk_cap;\nif (total_norm_risk < 40) {\n    total_norm_risk =  2.125 * total_norm_risk;\n}\nelse if (total_norm_risk >= 40 && total_norm_risk < 50) {\n    total_norm_risk = 85 + (total_norm_risk - 40);\n}\nelse {\n    total_norm_risk = 95 + (total_norm_risk - 50) / 10;\n}\n\nList rule_stats = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n    Map temp = new HashMap();\n    temp["rule_name"] = key;\n    temp["rule_risk"] = total_risk_stats[key];\n    rule_stats.add(temp);\n}\n\nreturn ["calculated_score_norm": total_norm_risk, "rule_risks": rule_stats];';
  return {
    id: getRiskScoreReduceScriptId(RiskScoreEntity.user, spaceId),
    script: {
      lang: 'painless',
      source: stringifyScript ? JSON.stringify(source) : source,
    },
  };
};

/**
 * This should be aligned with
 * console_templates/enable_user_risk_score.console step 4
 * console_templates/enable_host_risk_score.console step 5
 */
export const getRiskScoreIngestPipelineOptions = (
  riskScoreEntity: RiskScoreEntity,
  spaceId = 'default',
  stringifyScript?: boolean
): Pipeline => {
  const processors: Processor[] = [
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
        id: getRiskScoreLevelScriptId(riskScoreEntity, spaceId),
        params: {
          risk_score: `${riskScoreEntity}.risk.calculated_score_norm`,
        },
      },
    },
  ];
  return {
    name: getIngestPipelineName(riskScoreEntity, spaceId),
    processors: stringifyScript ? JSON.stringify(processors) : processors,
  };
};

/**
 * This should be aligned with
 * console_templates/enable_user_risk_score.console step 5
 * console_templates/enable_host_risk_score.console step 6
 */
export const getCreateRiskScoreIndicesOptions = ({
  spaceId = 'default',
  riskScoreEntity,
  stringifyScript,
}: {
  spaceId?: string;
  riskScoreEntity: RiskScoreEntity;
  stringifyScript?: boolean;
}) => {
  const mappings = {
    properties: {
      [riskScoreEntity]: {
        properties: {
          name: {
            type: 'keyword',
          },
          risk: {
            properties: {
              calculated_score_norm: {
                type: 'float',
              },
              calculated_level: {
                type: 'keyword',
              },
              multipliers: {
                type: 'keyword',
              },
              rule_risks: {
                properties: {
                  rule_name: {
                    type: 'text',
                    fields: {
                      keyword: {
                        type: 'keyword',
                      },
                    },
                  },
                  rule_risk: {
                    type: 'float',
                  },
                  rule_id: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
        },
      },
      ingest_timestamp: {
        type: 'date',
      },
      '@timestamp': {
        type: 'date',
      },
    },
  };
  return {
    index: getPivotTransformIndex(riskScoreEntity, spaceId),
    mappings: stringifyScript ? JSON.stringify(mappings) : mappings,
  };
};

/**
 * This should be aligned with
 * console_templates/enable_user_risk_score.console step 8
 * console_templates/enable_host_risk_score.console step 9
 */
export const getCreateRiskScoreLatestIndicesOptions = ({
  spaceId = 'default',
  riskScoreEntity,
  stringifyScript,
}: {
  spaceId?: string;
  riskScoreEntity: RiskScoreEntity;
  stringifyScript?: boolean;
}) => {
  const mappings = {
    properties: {
      [riskScoreEntity]: {
        properties: {
          name: {
            type: 'keyword',
          },
          risk: {
            properties: {
              calculated_score_norm: {
                type: 'float',
              },
              calculated_level: {
                type: 'keyword',
              },
              multipliers: {
                type: 'keyword',
              },
              rule_risks: {
                properties: {
                  rule_name: {
                    type: 'text',
                    fields: {
                      keyword: {
                        type: 'keyword',
                      },
                    },
                  },
                  rule_risk: {
                    type: 'float',
                  },
                  rule_id: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
        },
      },
      ingest_timestamp: {
        type: 'date',
      },
      '@timestamp': {
        type: 'date',
      },
    },
  };
  return {
    index: getLatestTransformIndex(riskScoreEntity, spaceId),
    mappings: stringifyScript ? JSON.stringify(mappings) : mappings,
  };
};

/**
 * This should be aligned with
 * console_templates/enable_host_risk_score.console step 7
 */
export const getCreateMLHostPivotTransformOptions = ({
  spaceId = 'default',
  stringifyScript,
}: {
  spaceId?: string;
  stringifyScript?: boolean;
}) => {
  const options = {
    dest: {
      index: getPivotTransformIndex(RiskScoreEntity.host, spaceId),
      pipeline: getIngestPipelineName(RiskScoreEntity.host, spaceId),
    },
    frequency: '1h',
    pivot: {
      aggregations: {
        '@timestamp': {
          max: {
            field: '@timestamp',
          },
        },
        'host.risk': {
          scripted_metric: {
            combine_script: 'return state',
            init_script: {
              id: getRiskScoreInitScriptId(RiskScoreEntity.host, spaceId),
            },
            map_script: {
              id: getRiskScoreMapScriptId(RiskScoreEntity.host, spaceId),
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
              id: getRiskScoreReduceScriptId(RiskScoreEntity.host, spaceId),
            },
          },
        },
      },
      group_by: {
        [RiskScoreFields.hostName]: {
          terms: {
            field: RiskScoreFields.hostName,
          },
        },
      },
    },
    source: {
      index: [getAlertsIndex(spaceId)],
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
  };

  return stringifyScript ? JSON.stringify(options) : options;
};

/**
 * This should be aligned with
 * console_templates/enable_user_risk_score.console step 6
 */
export const getCreateMLUserPivotTransformOptions = ({
  spaceId = 'default',
  stringifyScript,
}: {
  spaceId?: string;
  stringifyScript?: boolean;
}) => {
  const options = {
    dest: {
      index: getPivotTransformIndex(RiskScoreEntity.user, spaceId),
      pipeline: getIngestPipelineName(RiskScoreEntity.user, spaceId),
    },
    frequency: '1h',
    pivot: {
      aggregations: {
        '@timestamp': {
          max: {
            field: '@timestamp',
          },
        },
        'user.risk': {
          scripted_metric: {
            combine_script: 'return state',
            init_script: 'state.rule_risk_stats = new HashMap();',
            map_script: {
              id: getRiskScoreMapScriptId(RiskScoreEntity.user, spaceId),
            },
            params: {
              max_risk: 100,
              p: 1.5,
              zeta_constant: 2.612,
            },
            reduce_script: {
              id: getRiskScoreReduceScriptId(RiskScoreEntity.user, spaceId),
            },
          },
        },
      },
      group_by: {
        'user.name': {
          terms: {
            field: 'user.name',
          },
        },
      },
    },
    source: {
      index: [getAlertsIndex(spaceId)],
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: 'now-90d',
                },
              },
            },
            {
              match: {
                'signal.status': 'open',
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
  };
  return stringifyScript ? JSON.stringify(options) : options;
};

/**
 * This should be aligned with
 * console_templates/enable_user_risk_score.console step 9
 * console_templates/enable_host_risk_score.console step 10
 */
export const getCreateLatestTransformOptions = ({
  spaceId = 'default',
  riskScoreEntity,
  stringifyScript,
}: {
  spaceId?: string;
  riskScoreEntity: RiskScoreEntity;
  stringifyScript?: boolean;
}) => {
  const options = {
    dest: {
      index: getLatestTransformIndex(riskScoreEntity, spaceId),
    },
    frequency: '1h',
    latest: {
      sort: '@timestamp',
      unique_key: [`${riskScoreEntity}.name`],
    },
    source: {
      index: [getPivotTransformIndex(riskScoreEntity, spaceId)],
    },
    sync: {
      time: {
        delay: '2s',
        field: 'ingest_timestamp',
      },
    },
  };
  return stringifyScript ? JSON.stringify(options) : options;
};
