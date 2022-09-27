/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAlertsIndex,
  getIngestPipelineName,
  getLatestTransformIndex,
  getLegacyIngestPipelineName,
  getLegacyRiskScoreInitScriptId,
  getLegacyRiskScoreLevelScriptId,
  getLegacyRiskScoreMapScriptId,
  getLegacyRiskScoreReduceScriptId,
  getPivotTransformIndex,
  getRiskScoreInitScriptId,
  getRiskScoreLatestTransformId,
  getRiskScoreLevelScriptId,
  getRiskScoreMapScriptId,
  getRiskScorePivotTransformId,
  getRiskScoreReduceScriptId,
  RiskScoreEntity,
} from '../../screens/entity_analytics';
import { ENTITY_ANALYTICS_URL } from '../../urls/navigation';
import { visit } from '../login';
import { createIndex, deleteRiskScoreIndicies } from './indices';
import { createIngestPipeline, deleteRiskScoreIngestPipelines } from './ingest_pipelines';
import { deleteSavedObjects } from './saved_objects';
import { createStoredScript, deleteStoredScripts } from './stored_scripts';
import { createTransform, deleteTransforms, startTransforms } from './transforms';

/**
 * @deleteAll: If set to true, it deletes both old and new version.
 * If set to false, it deletes legacy version only.
 */
export const deleteRiskScore = async ({
  riskScoreEntity,
  spaceId,
  deleteAll,
}: {
  riskScoreEntity: RiskScoreEntity;
  spaceId?: string;
  deleteAll: boolean;
}) => {
  const transformIds = [
    getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
  ];
  const legacyIngestPipelineNames = [getLegacyIngestPipelineName(riskScoreEntity)];
  const ingestPipelinesNames = deleteAll
    ? [...legacyIngestPipelineNames, getIngestPipelineName(riskScoreEntity, spaceId)]
    : legacyIngestPipelineNames;

  const legacyScriptIds = [
    ...(riskScoreEntity === RiskScoreEntity.host
      ? [getLegacyRiskScoreInitScriptId(riskScoreEntity)]
      : []),
    getLegacyRiskScoreLevelScriptId(riskScoreEntity),
    getLegacyRiskScoreMapScriptId(riskScoreEntity),
    getLegacyRiskScoreReduceScriptId(riskScoreEntity),
  ];
  const scripts = deleteAll
    ? [
        ...legacyScriptIds,
        ...(riskScoreEntity === RiskScoreEntity.host
          ? [getRiskScoreInitScriptId(riskScoreEntity, spaceId)]
          : []),
        getRiskScoreLevelScriptId(riskScoreEntity, spaceId),
        getRiskScoreMapScriptId(riskScoreEntity, spaceId),
        getRiskScoreReduceScriptId(riskScoreEntity, spaceId),
      ]
    : legacyScriptIds;

  await deleteTransforms(transformIds);
  deleteRiskScoreIngestPipelines(ingestPipelinesNames);
  deleteStoredScripts(scripts);
  deleteSavedObjects(`${riskScoreEntity}RiskScoreDashboards`, deleteAll);
  deleteRiskScoreIndicies(riskScoreEntity, spaceId);
};

const getLegacyRiskHostCreateLevelScriptOptions = (stringifyScript?: boolean) => {
  const source =
    "double risk_score = (def)ctx.getByPath(params.risk_score);\nif (risk_score < 20) {\n    ctx['risk'] = 'Unknown'\n}\nelse if (risk_score >= 20 && risk_score < 40) {\n    ctx['risk'] = 'Low'\n}\nelse if (risk_score >= 40 && risk_score < 70) {\n    ctx['risk'] = 'Moderate'\n}\nelse if (risk_score >= 70 && risk_score < 90) {\n    ctx['risk'] = 'High'\n}\nelse if (risk_score >= 90) {\n    ctx['risk'] = 'Critical'\n}";
  return {
    id: getLegacyRiskScoreLevelScriptId(RiskScoreEntity.host),
    script: {
      lang: 'painless',
      source: stringifyScript ? JSON.stringify(source) : source,
    },
  };
};

const getLegacyRiskHostCreateInitScriptOptions = (stringifyScript?: boolean) => {
  const source =
    'state.rule_risk_stats = new HashMap();\nstate.host_variant_set = false;\nstate.host_variant = new String();\nstate.tactic_ids = new HashSet();';
  return {
    id: getLegacyRiskScoreInitScriptId(RiskScoreEntity.host),
    script: {
      lang: 'painless',
      source: stringifyScript ? JSON.stringify(source) : source,
    },
  };
};

const getLegacyRiskHostCreateMapScriptOptions = (stringifyScript?: boolean) => {
  const source =
    '// Get the host variant\nif (state.host_variant_set == false) {\n    if (doc.containsKey("host.os.full") && doc["host.os.full"].size() != 0) {\n        state.host_variant = doc["host.os.full"].value;\n        state.host_variant_set = true;\n    }\n}\n// Aggregate all the tactics seen on the host\nif (doc.containsKey("signal.rule.threat.tactic.id") && doc["signal.rule.threat.tactic.id"].size() != 0) {\n    state.tactic_ids.add(doc["signal.rule.threat.tactic.id"].value);\n}\n// Get running sum of time-decayed risk score per rule name per shard\nString rule_name = doc["signal.rule.name"].value;\ndef stats = state.rule_risk_stats.getOrDefault(rule_name, [0.0,"",false]);\nint time_diff = (int)((System.currentTimeMillis() - doc["@timestamp"].value.toInstant().toEpochMilli()) / (1000.0 * 60.0 * 60.0));\ndouble risk_derate = Math.min(1, Math.exp((params.lookback_time - time_diff) / params.time_decay_constant));\nstats[0] = Math.max(stats[0], doc["signal.rule.risk_score"].value * risk_derate);\nif (stats[2] == false) {\n    stats[1] = doc["kibana.alert.rule.uuid"].value;\n    stats[2] = true;\n}\nstate.rule_risk_stats.put(rule_name, stats);';
  return {
    id: getLegacyRiskScoreMapScriptId(RiskScoreEntity.host),
    script: {
      lang: 'painless',
      source: stringifyScript ? JSON.stringify(source) : source,
    },
  };
};

const getLegacyRiskHostCreateReduceScriptOptions = (stringifyScript?: boolean) => {
  const source =
    '// Consolidating time decayed risks and tactics from across all shards\nMap total_risk_stats = new HashMap();\nString host_variant = new String();\ndef tactic_ids = new HashSet();\nfor (state in states) {\n    for (key in state.rule_risk_stats.keySet()) {\n        def rule_stats = state.rule_risk_stats.get(key);\n        def stats = total_risk_stats.getOrDefault(key, [0.0,"",false]);\n        stats[0] = Math.max(stats[0], rule_stats[0]);\n        if (stats[2] == false) {\n            stats[1] = rule_stats[1];\n            stats[2] = true;\n        } \n        total_risk_stats.put(key, stats);\n    }\n    if (host_variant.length() == 0) {\n        host_variant = state.host_variant;\n    }\n    tactic_ids.addAll(state.tactic_ids);\n}\n// Consolidating individual rule risks and arranging them in decreasing order\nList risks = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n    risks.add(total_risk_stats[key][0])\n}\nCollections.sort(risks, Collections.reverseOrder());\n// Calculating total host risk score\ndouble total_risk = 0.0;\ndouble risk_cap = params.max_risk * params.zeta_constant;\nfor (int i=0;i<risks.length;i++) {\n    total_risk += risks[i] / Math.pow((1+i), params.p);\n}\n// Normalizing the host risk score\ndouble total_norm_risk = 100 * total_risk / risk_cap;\nif (total_norm_risk < 40) {\n    total_norm_risk =  2.125 * total_norm_risk;\n}\nelse if (total_norm_risk >= 40 && total_norm_risk < 50) {\n    total_norm_risk = 85 + (total_norm_risk - 40);\n}\nelse {\n    total_norm_risk = 95 + (total_norm_risk - 50) / 10;\n}\n// Calculating multipliers to the host risk score\ndouble risk_multiplier = 1.0;\nList multipliers = new ArrayList();\n// Add a multiplier if host is a server\nif (host_variant.toLowerCase().contains("server")) {\n    risk_multiplier *= params.server_multiplier;\n    multipliers.add("Host is a server");\n}\n// Add multipliers based on number and diversity of tactics seen on the host\nfor (String tactic : tactic_ids) {\n    multipliers.add("Tactic "+tactic);\n    risk_multiplier *= 1 + params.tactic_base_multiplier * params.tactic_weights.getOrDefault(tactic, 0);\n}\n// Calculating final risk\ndouble final_risk = total_norm_risk;\nif (risk_multiplier > 1.0) {\n    double prior_odds = (total_norm_risk) / (100 - total_norm_risk);\n    double updated_odds = prior_odds * risk_multiplier; \n    final_risk = 100 * updated_odds / (1 + updated_odds);\n}\n// Adding additional metadata\nList rule_stats = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n    Map temp = new HashMap();\n    temp["rule_name"] = key;\n    temp["rule_risk"] = total_risk_stats[key][0];\n    temp["rule_id"] = total_risk_stats[key][1];\n    rule_stats.add(temp);\n}\n\nreturn ["calculated_score_norm": final_risk, "rule_risks": rule_stats, "multipliers": multipliers];';
  return {
    id: getLegacyRiskScoreReduceScriptId(RiskScoreEntity.host),
    script: {
      lang: 'painless',
      source: stringifyScript ? JSON.stringify(source) : source,
    },
  };
};

const getLegacyRiskScoreIngestPipelineOptions = (riskScoreEntity: RiskScoreEntity) => {
  const processors = [
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
        id: getLegacyRiskScoreLevelScriptId(riskScoreEntity),
        params: {
          risk_score: 'risk_stats.risk_score',
        },
      },
    },
  ];
  return {
    name: getLegacyIngestPipelineName(riskScoreEntity),
    processors,
  };
};

const getCreateLegacyRiskScoreIndicesOptions = ({
  spaceId = 'default',
  riskScoreEntity,
}: {
  spaceId?: string;
  riskScoreEntity: RiskScoreEntity;
}) => {
  const mappings = {
    properties: {
      [`${riskScoreEntity}.name`]: {
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
  };
  return {
    index: getPivotTransformIndex(riskScoreEntity, spaceId),
    mappings,
  };
};

const getCreateLegacyMLHostPivotTransformOptions = ({
  spaceId = 'default',
}: {
  spaceId?: string;
}) => {
  const options = {
    dest: {
      index: getPivotTransformIndex(RiskScoreEntity.host, spaceId),
      pipeline: getLegacyIngestPipelineName(RiskScoreEntity.host),
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
              id: getLegacyRiskScoreInitScriptId(RiskScoreEntity.host),
            },
            map_script: {
              id: getLegacyRiskScoreMapScriptId(RiskScoreEntity.host),
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
              id: getLegacyRiskScoreReduceScriptId(RiskScoreEntity.host),
            },
          },
        },
      },
      group_by: {
        [`${RiskScoreEntity.host}.name`]: {
          terms: {
            field: `${RiskScoreEntity.host}.name`,
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

  return options;
};

const getCreateLegacyRiskScoreLatestIndicesOptions = ({
  spaceId = 'default',
  riskScoreEntity,
}: {
  spaceId?: string;
  riskScoreEntity: RiskScoreEntity;
}) => {
  const mappings = {
    properties: {
      [`${riskScoreEntity}.name`]: {
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
  };
  return {
    index: getLatestTransformIndex(riskScoreEntity, spaceId),
    mappings,
  };
};

const getCreateLegacyLatestTransformOptions = ({
  spaceId = 'default',
  riskScoreEntity,
}: {
  spaceId?: string;
  riskScoreEntity: RiskScoreEntity;
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
  return options;
};

const installLegacyHostRiskScoreModule = (spaceId: string) => {
  /**
   * Step 1 Upload script: ml_hostriskscore_levels_script
   */
  createStoredScript(getLegacyRiskHostCreateLevelScriptOptions())
    .then(() => {
      /**
       * Step 2 Upload script: ml_hostriskscore_init_script
       */
      return createStoredScript(getLegacyRiskHostCreateInitScriptOptions());
    })
    .then(() => {
      /**
       * Step 3 Upload script: ml_hostriskscore_map_script
       */
      return createStoredScript(getLegacyRiskHostCreateMapScriptOptions());
    })
    .then(() => {
      /**
       * Step 4 Upload script: ml_hostriskscore_reduce_script
       */
      return createStoredScript(getLegacyRiskHostCreateReduceScriptOptions());
    })
    .then(() => {
      /**
       * Step 5 Upload the ingest pipeline: ml_hostriskscore_ingest_pipeline
       */
      return createIngestPipeline(getLegacyRiskScoreIngestPipelineOptions(RiskScoreEntity.host));
    })
    .then(() => {
      /**
       * Step 6 create ml_host_risk_score_{spaceId} index
       */
      return createIndex(
        getCreateLegacyRiskScoreIndicesOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.host,
        })
      );
    })
    .then(() => {
      /**
       * Step 7 create transform: ml_hostriskscore_pivot_transform_{spaceId}
       */
      return createTransform(
        getRiskScorePivotTransformId(RiskScoreEntity.host, spaceId),
        getCreateLegacyMLHostPivotTransformOptions({ spaceId })
      );
    })
    .then(() => {
      /**
       * Step 8 create ml_host_risk_score_latest_{spaceId} index
       */
      return createIndex(
        getCreateLegacyRiskScoreLatestIndicesOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.host,
        })
      );
    })
    .then(() => {
      /**
       * Step 9 create transform: ml_hostriskscore_latest_transform_{spaceId}
       */
      return createTransform(
        getRiskScoreLatestTransformId(RiskScoreEntity.host, spaceId),
        getCreateLegacyLatestTransformOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.host,
        })
      );
    })
    .then(() => {
      /**
       * Step 10 Start the pivot transform
       * Step 11 Start the latest transform
       */
      const transformIds = [
        getRiskScorePivotTransformId(RiskScoreEntity.host, spaceId),
        getRiskScoreLatestTransformId(RiskScoreEntity.host, spaceId),
      ];
      return startTransforms(transformIds);
    })
    .then(() => {
      // refresh page
      visit(ENTITY_ANALYTICS_URL);
    });
};

const getLegacyRiskUserCreateLevelScriptOptions = () => {
  const source =
    "double risk_score = (def)ctx.getByPath(params.risk_score);\nif (risk_score < 20) {\n  ctx['risk'] = 'Unknown'\n}\nelse if (risk_score >= 20 && risk_score < 40) {\n  ctx['risk'] = 'Low'\n}\nelse if (risk_score >= 40 && risk_score < 70) {\n  ctx['risk'] = 'Moderate'\n}\nelse if (risk_score >= 70 && risk_score < 90) {\n  ctx['risk'] = 'High'\n}\nelse if (risk_score >= 90) {\n  ctx['risk'] = 'Critical'\n}";
  return {
    id: getLegacyRiskScoreLevelScriptId(RiskScoreEntity.user),
    script: {
      lang: 'painless',
      source,
    },
  };
};

const getLegacyRiskUserCreateMapScriptOptions = () => {
  const source =
    '// Get running sum of risk score per rule name per shard\\\\\nString rule_name = doc["signal.rule.name"].value;\ndef stats = state.rule_risk_stats.getOrDefault(rule_name, 0.0);\nstats = doc["signal.rule.risk_score"].value;\nstate.rule_risk_stats.put(rule_name, stats);';
  return {
    id: getLegacyRiskScoreMapScriptId(RiskScoreEntity.user),
    script: {
      lang: 'painless',
      source,
    },
  };
};

const getLegacyRiskUserCreateReduceScriptOptions = () => {
  const source =
    '// Consolidating time decayed risks from across all shards\nMap total_risk_stats = new HashMap();\nfor (state in states) {\n    for (key in state.rule_risk_stats.keySet()) {\n    def rule_stats = state.rule_risk_stats.get(key);\n    def stats = total_risk_stats.getOrDefault(key, 0.0);\n    stats = rule_stats;\n    total_risk_stats.put(key, stats);\n    }\n}\n// Consolidating individual rule risks and arranging them in decreasing order\nList risks = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n    risks.add(total_risk_stats[key])\n}\nCollections.sort(risks, Collections.reverseOrder());\n// Calculating total risk and normalizing it to a range\ndouble total_risk = 0.0;\ndouble risk_cap = params.max_risk * params.zeta_constant;\nfor (int i=0;i<risks.length;i++) {\n    total_risk += risks[i] / Math.pow((1+i), params.p);\n}\ndouble total_norm_risk = 100 * total_risk / risk_cap;\nif (total_norm_risk < 40) {\n    total_norm_risk =  2.125 * total_norm_risk;\n}\nelse if (total_norm_risk >= 40 && total_norm_risk < 50) {\n    total_norm_risk = 85 + (total_norm_risk - 40);\n}\nelse {\n    total_norm_risk = 95 + (total_norm_risk - 50) / 10;\n}\n\nList rule_stats = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n    Map temp = new HashMap();\n    temp["rule_name"] = key;\n    temp["rule_risk"] = total_risk_stats[key];\n    rule_stats.add(temp);\n}\n\nreturn ["risk_score": total_norm_risk, "rule_risks": rule_stats];';
  return {
    id: getLegacyRiskScoreReduceScriptId(RiskScoreEntity.user),
    script: {
      lang: 'painless',
      source,
    },
  };
};

const getCreateLegacyMLUserPivotTransformOptions = ({
  spaceId = 'default',
}: {
  spaceId?: string;
}) => {
  const options = {
    dest: {
      index: getPivotTransformIndex(RiskScoreEntity.user, spaceId),
      pipeline: getLegacyIngestPipelineName(RiskScoreEntity.user),
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
            init_script: 'state.rule_risk_stats = new HashMap();',
            map_script: {
              id: getLegacyRiskScoreMapScriptId(RiskScoreEntity.user),
            },
            params: {
              max_risk: 100,
              p: 1.5,
              zeta_constant: 2.612,
            },
            reduce_script: {
              id: getLegacyRiskScoreReduceScriptId(RiskScoreEntity.user),
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
  return options;
};

const installLegacyUserRiskScoreModule = async (spaceId = 'default') => {
  /**
   * Step 1 Upload script: ml_userriskscore_levels_script
   */
  createStoredScript(getLegacyRiskUserCreateLevelScriptOptions())
    .then(() => {
      /**
       * Step 2 Upload script: ml_userriskscore_map_script
       */
      return createStoredScript(getLegacyRiskUserCreateMapScriptOptions());
    })
    .then(() => {
      /**
       * Step 3 Upload script: ml_userriskscore_reduce_script
       */
      return createStoredScript(getLegacyRiskUserCreateReduceScriptOptions());
    })
    .then(() => {
      /**
       * Step 4 Upload ingest pipeline: ml_userriskscore_ingest_pipeline
       */
      return createIngestPipeline(getLegacyRiskScoreIngestPipelineOptions(RiskScoreEntity.user));
    })
    .then(() => {
      /**
       * Step 5 create ml_user_risk_score_{spaceId} index
       */
      return createIndex(
        getCreateLegacyRiskScoreIndicesOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.user,
        })
      );
    })
    .then(() => {
      /**
       * Step 6 create Transform: ml_userriskscore_pivot_transform_{spaceId}
       */
      return createTransform(
        getRiskScorePivotTransformId(RiskScoreEntity.user, spaceId),
        getCreateLegacyMLUserPivotTransformOptions({ spaceId })
      );
    })
    .then(() => {
      /**
       * Step 7 create ml_user_risk_score_latest_{spaceId} index
       */
      return createIndex(
        getCreateLegacyRiskScoreLatestIndicesOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.user,
        })
      );
    })
    .then(() => {
      /**
       * Step 8 create Transform: ml_userriskscore_latest_transform_{spaceId}
       */
      return createTransform(
        getRiskScoreLatestTransformId(RiskScoreEntity.user, spaceId),
        getCreateLegacyLatestTransformOptions({
          spaceId,
          riskScoreEntity: RiskScoreEntity.user,
        })
      );
    })
    .then(() => {
      /**
       * Step 9 Start the pivot transform
       * Step 10 Start the latest transform
       */
      const transformIds = [
        getRiskScorePivotTransformId(RiskScoreEntity.user, spaceId),
        getRiskScoreLatestTransformId(RiskScoreEntity.user, spaceId),
      ];
      return startTransforms(transformIds);
    })
    .then(() => {
      visit(ENTITY_ANALYTICS_URL);
    });
};

export const installLegacyRiskScoreModule = (
  riskScoreEntity: RiskScoreEntity,
  spaceId = 'default'
) => {
  if (riskScoreEntity === RiskScoreEntity.user) {
    installLegacyUserRiskScoreModule(spaceId);
  } else {
    installLegacyHostRiskScoreModule(spaceId);
  }
};
