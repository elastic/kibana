/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup, NotificationsStart } from '@kbn/core/public';
import {
  createIngestPipeline,
  createIndices,
  createTransform,
  startTransforms,
  deleteTransforms,
  deleteIngestPipelines,
  restartTransforms,
  stopTransforms,
} from './api';
import {
  INGEST_PIPELINE_DELETION_ERROR_MESSAGE,
  INSTALLATION_ERROR,
  START_TRANSFORMS_ERROR_MESSAGE,
  TRANSFORM_CREATION_ERROR_MESSAGE,
  TRANSFORM_DELETION_ERROR_MESSAGE,
  UNINSTALLATION_ERROR,
} from './api/translations';

export enum InstallationState {
  Started = 'STARTED',
  Done = 'DONE',
}

export enum UpgradeState {
  Started = 'STARTED',
  Done = 'DONE',
}

export enum RestartState {
  Started = 'STARTED',
  Done = 'DONE',
}

export enum RiskScoreModuleName {
  Host = 'host',
  User = 'user',
}

export const getRiskScorePivotTransformId = (
  moduleName: RiskScoreModuleName,
  spaceId = 'default'
) => `ml_${moduleName}riskscore_pivot_transform_${spaceId}`;
export const getRiskScoreLatestTransformId = (
  moduleName: RiskScoreModuleName,
  spaceId = 'default'
) => `ml_${moduleName}riskscore_latest_transform_${spaceId}`;
const getIngestPipelineName = (moduleName: RiskScoreModuleName) =>
  `ml_${moduleName}riskscore_ingest_pipeline`;

/**
 * This should be aligned with
 * console_templates/enable_user_risk_score.console step 4
 * console_templates/enable_host_risk_score.console step 5
 */
export const getRiskScoreIngestPipelineOptions = (moduleName: RiskScoreModuleName) => ({
  name: getIngestPipelineName(moduleName),
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
        source: `double risk_score = (def)ctx.getByPath(params.risk_score);\nif (risk_score < 20) {\n    ctx['${moduleName}']['risk']['calculated_level'] = 'Unknown'\n}\nelse if (risk_score >= 20 && risk_score < 40) {\n    ctx['${moduleName}']['risk']['calculated_level'] = 'Low'\n}\nelse if (risk_score >= 40 && risk_score < 70) {\n    ctx['${moduleName}']['risk']['calculated_level'] = 'Moderate'\n}\nelse if (risk_score >= 70 && risk_score < 90) {\n    ctx['${moduleName}']['risk']['calculated_level'] = 'High'\n}\nelse if (risk_score >= 90) {\n    ctx['${moduleName}']['risk']['calculated_level'] = 'Critical'\n}`,
        params: {
          risk_score: `${moduleName}.risk.calculated_score_norm`,
        },
      },
    },
  ],
});

/**
 * This should be aligned with
 * console_templates/enable_user_risk_score.console step 5
 * console_templates/enable_host_risk_score.console step 6
 */
export const getCreateRiskScoreIndicesOptions = ({
  spaceId = 'default',
  moduleName,
}: {
  spaceId?: string;
  moduleName: RiskScoreModuleName;
}) => ({
  index: `ml_${moduleName}_risk_score_${spaceId}`,
  mappings: {
    properties: {
      [moduleName]: {
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
  },
});

/**
 * This should be aligned with
 * console_templates/enable_user_risk_score.console step 8
 * console_templates/enable_host_risk_score.console step 9
 */
export const getCreateRiskScoreLatestIndicesOptions = ({
  spaceId = 'default',
  moduleName,
}: {
  spaceId?: string;
  moduleName: RiskScoreModuleName;
}) => ({
  index: `ml_${moduleName}_risk_score_latest_${spaceId}`,
  mappings: {
    properties: {
      [moduleName]: {
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
  },
});

/**
 * This should be aligned with
 * console_templates/enable_host_risk_score.console step 7
 */
export const getCreateMLHostPivotTransformOptions = ({
  spaceId = 'default',
}: {
  spaceId?: string;
}) => ({
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
      'host.risk': {
        scripted_metric: {
          combine_script: 'return state',
          init_script: {
            source:
              'state.rule_risk_stats = new HashMap();\nstate.host_variant_set = false;\nstate.host_variant = new String();\nstate.tactic_ids = new HashSet();',
          },
          map_script: {
            source:
              '// Get the host variant\nif (state.host_variant_set == false) {\n if (doc.containsKey("host.os.full") && doc["host.os.full"].size() != 0) {\n state.host_variant = doc["host.os.full"].value;\n state.host_variant_set = true;\n }\n}\n// Aggregate all the tactics seen on the host\nif (doc.containsKey("signal.rule.threat.tactic.id") && doc["signal.rule.threat.tactic.id"].size() != 0) {\n state.tactic_ids.add(doc["signal.rule.threat.tactic.id"].value);\n}\n// Get running sum of time-decayed risk score per rule name per shard\nString rule_name = doc["signal.rule.name"].value;\ndef stats = state.rule_risk_stats.getOrDefault(rule_name, [0.0,"",false]);\nint time_diff = (int)((System.currentTimeMillis() - doc["@timestamp"].value.toInstant().toEpochMilli()) / (1000.0 * 60.0 * 60.0));\ndouble risk_derate = Math.min(1, Math.exp((params.lookback_time - time_diff) / params.time_decay_constant));\nstats[0] = Math.max(stats[0], doc["signal.rule.risk_score"].value * risk_derate);\nif (stats[2] == false) {\n stats[1] = doc["kibana.alert.rule.uuid"].value;\n stats[2] = true;\n}\nstate.rule_risk_stats.put(rule_name, stats);',
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
              '// Consolidating time decayed risks and tactics from across all shards\nMap total_risk_stats = new HashMap();\nString host_variant = new String();\ndef tactic_ids = new HashSet();\nfor (state in states) {\n for (key in state.rule_risk_stats.keySet()) {\n def rule_stats = state.rule_risk_stats.get(key);\n def stats = total_risk_stats.getOrDefault(key, [0.0,"",false]);\n stats[0] = Math.max(stats[0], rule_stats[0]);\n if (stats[2] == false) {\n stats[1] = rule_stats[1];\n stats[2] = true;\n } \n total_risk_stats.put(key, stats);\n }\n if (host_variant.length() == 0) {\n host_variant = state.host_variant;\n }\n tactic_ids.addAll(state.tactic_ids);\n}\n// Consolidating individual rule risks and arranging them in decreasing order\nList risks = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n risks.add(total_risk_stats[key][0])\n}\nCollections.sort(risks, Collections.reverseOrder());\n// Calculating total host risk score\ndouble total_risk = 0.0;\ndouble risk_cap = params.max_risk * params.zeta_constant;\nfor (int i=0;i<risks.length;i++) {\n total_risk += risks[i] / Math.pow((1+i), params.p);\n}\n// Normalizing the host risk score\ndouble total_norm_risk = 100 * total_risk / risk_cap;\nif (total_norm_risk < 40) {\n total_norm_risk = 2.125 * total_norm_risk;\n}\nelse if (total_norm_risk >= 40 && total_norm_risk < 50) {\n total_norm_risk = 85 + (total_norm_risk - 40);\n}\nelse {\n total_norm_risk = 95 + (total_norm_risk - 50) / 10;\n}\n// Calculating multipliers to the host risk score\ndouble risk_multiplier = 1.0;\nList multipliers = new ArrayList();\n// Add a multiplier if host is a server\nif (host_variant.toLowerCase().contains("server")) {\n risk_multiplier *= params.server_multiplier;\n multipliers.add("Host is a server");\n}\n// Add multipliers based on number and diversity of tactics seen on the host\nfor (String tactic : tactic_ids) {\n multipliers.add("Tactic "+tactic);\n risk_multiplier *= 1 + params.tactic_base_multiplier * params.tactic_weights.getOrDefault(tactic, 0);\n}\n// Calculating final risk\ndouble final_risk = total_norm_risk;\nif (risk_multiplier > 1.0) {\n double prior_odds = (total_norm_risk) / (100 - total_norm_risk);\n double updated_odds = prior_odds * risk_multiplier; \n final_risk = 100 * updated_odds / (1 + updated_odds);\n}\n// Adding additional metadata\nList rule_stats = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n Map temp = new HashMap();\n temp["rule_name"] = key;\n temp["rule_risk"] = total_risk_stats[key][0];\n temp["rule_id"] = total_risk_stats[key][1];\n rule_stats.add(temp);\n}\n\nreturn ["calculated_score_norm": final_risk, "rule_risks": rule_stats, "multipliers": multipliers];',
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

/**
 * This should be aligned with
 * console_templates/enable_user_risk_score.console step 6
 */
export const getCreateMLUserPivotTransformOptions = ({
  spaceId = 'default',
}: {
  spaceId?: string;
}) => ({
  dest: {
    index: `ml_user_risk_score_${spaceId}`,
    pipeline: 'ml_userriskscore_ingest_pipeline',
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
            source:
              '// Get running sum of risk score per rule name per shard\\\\\nString rule_name = doc["signal.rule.name"].value;\ndef stats = state.rule_risk_stats.getOrDefault(rule_name, 0.0);\nstats = doc["signal.rule.risk_score"].value;\nstate.rule_risk_stats.put(rule_name, stats);',
          },
          params: {
            max_risk: 100,
            p: 1.5,
            zeta_constant: 2.612,
          },
          reduce_script: {
            source:
              '// Consolidating time decayed risks from across all shards\nMap total_risk_stats = new HashMap();\nfor (state in states) {\n    for (key in state.rule_risk_stats.keySet()) {\n    def rule_stats = state.rule_risk_stats.get(key);\n    def stats = total_risk_stats.getOrDefault(key, 0.0);\n    stats = rule_stats;\n    total_risk_stats.put(key, stats);\n    }\n}\n// Consolidating individual rule risks and arranging them in decreasing order\nList risks = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n    risks.add(total_risk_stats[key])\n}\nCollections.sort(risks, Collections.reverseOrder());\n// Calculating total risk and normalizing it to a range\ndouble total_risk = 0.0;\ndouble risk_cap = params.max_risk * params.zeta_constant;\nfor (int i=0;i<risks.length;i++) {\n    total_risk += risks[i] / Math.pow((1+i), params.p);\n}\ndouble total_norm_risk = 100 * total_risk / risk_cap;\nif (total_norm_risk < 40) {\n    total_norm_risk =  2.125 * total_norm_risk;\n}\nelse if (total_norm_risk >= 40 && total_norm_risk < 50) {\n    total_norm_risk = 85 + (total_norm_risk - 40);\n}\nelse {\n    total_norm_risk = 95 + (total_norm_risk - 50) / 10;\n}\n\nList rule_stats = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n    Map temp = new HashMap();\n    temp["rule_name"] = key;\n    temp["rule_risk"] = total_risk_stats[key];\n    rule_stats.add(temp);\n}\n\nreturn ["calculated_score_norm": total_norm_risk, "rule_risks": rule_stats];',
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
    index: [`.alerts-security.alerts-${spaceId}`],
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
});

/**
 * This should be aligned with
 * console_templates/enable_user_risk_score.console step 9
 * console_templates/enable_host_risk_score.console step 10
 */
export const getCreateLatestTransformOptions = ({
  spaceId = 'default',
  moduleName,
}: {
  spaceId?: string;
  moduleName: RiskScoreModuleName;
}) => ({
  dest: {
    index: `ml_${moduleName}_risk_score_latest_${spaceId}`,
  },
  frequency: '1h',
  latest: {
    sort: '@timestamp',
    unique_key: [`${moduleName}.name`],
  },
  source: {
    index: [`ml_${moduleName}_risk_score_${spaceId}`],
  },
  sync: {
    time: {
      delay: '2s',
      field: 'ingest_timestamp',
    },
  },
});

export const installHostRiskScoreModule = async ({
  http,
  notifications,
  spaceId = 'default',
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  spaceId?: string;
}) => {
  /**
   * console_templates/enable_host_risk_score.console
   * Step 5 Upload the ingest pipeline: ml_hostriskscore_ingest_pipeline
   */
  await createIngestPipeline({
    http,
    notifications,
    options: getRiskScoreIngestPipelineOptions(RiskScoreModuleName.Host),
  });
  /**
   * console_templates/enable_host_risk_score.console
   * Step 6 create ml_host_risk_score_{spaceId} index
   */
  await createIndices({
    http,
    notifications,
    options: getCreateRiskScoreIndicesOptions({
      spaceId,
      moduleName: RiskScoreModuleName.Host,
    }),
  });
  /**
   * console_templates/enable_host_risk_score.console
   * Step 9 create ml_host_risk_score_latest_{spaceId} index
   */
  await createIndices({
    http,
    options: getCreateRiskScoreLatestIndicesOptions({
      spaceId,
      moduleName: RiskScoreModuleName.Host,
    }),
  });
  /**
   * console_templates/enable_host_risk_score.console
   * Step 7 create transform: ml_hostriskscore_pivot_transform_{spaceId}
   */
  await createTransform({
    http,
    errorMessage: `${INSTALLATION_ERROR} - ${TRANSFORM_CREATION_ERROR_MESSAGE}`,
    transformId: getRiskScorePivotTransformId(RiskScoreModuleName.Host, spaceId),
    options: getCreateMLHostPivotTransformOptions({ spaceId }),
  });
  /**
   * console_templates/enable_host_risk_score.console
   * Step 10 create transform: ml_hostriskscore_latest_transform_{spaceId}
   */
  await createTransform({
    http,
    errorMessage: `${INSTALLATION_ERROR} - ${TRANSFORM_CREATION_ERROR_MESSAGE}`,
    transformId: getRiskScoreLatestTransformId(RiskScoreModuleName.Host, spaceId),
    options: getCreateLatestTransformOptions({ spaceId, moduleName: RiskScoreModuleName.Host }),
  });
  /**
   * console_templates/enable_host_risk_score.console
   * Step 8 Start the pivot transform
   * Step 11 Start the latest transform
   */
  await startTransforms({
    http,
    errorMessage: `${INSTALLATION_ERROR} - ${START_TRANSFORMS_ERROR_MESSAGE}`,
    transformIds: [
      getRiskScorePivotTransformId(RiskScoreModuleName.Host, spaceId),
      getRiskScoreLatestTransformId(RiskScoreModuleName.Host, spaceId),
    ],
  });
};

export const installUserRiskScoreModule = async ({
  http,
  notifications,
  spaceId = 'default',
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  spaceId?: string;
}) => {
  /**
   * console_templates/enable_user_risk_score.console
   * Step 4 Upload ingest pipeline: ml_userriskscore_ingest_pipeline
   */
  await createIngestPipeline({
    http,
    notifications,
    options: getRiskScoreIngestPipelineOptions(RiskScoreModuleName.User),
  });
  /**
   * console_templates/enable_user_risk_score.console
   * Step 5 create ml_user_risk_score_{spaceId} index
   */
  await createIndices({
    http,
    notifications,
    options: getCreateRiskScoreIndicesOptions({
      spaceId,
      moduleName: RiskScoreModuleName.User,
    }),
  });
  /**
   * console_templates/enable_user_risk_score.console
   * Step 8 create ml_user_risk_score_latest_{spaceId} index
   */
  await createIndices({
    http,
    options: getCreateRiskScoreLatestIndicesOptions({
      spaceId,
      moduleName: RiskScoreModuleName.User,
    }),
  });
  /**
   * console_templates/enable_user_risk_score.console
   * Step 6 create Transform: ml_userriskscore_pivot_transform_{spaceId}
   */
  await createTransform({
    http,
    errorMessage: `${INSTALLATION_ERROR} - Transform creation failed`,
    transformId: getRiskScorePivotTransformId(RiskScoreModuleName.User, spaceId),
    options: getCreateMLUserPivotTransformOptions({ spaceId }),
  });
  /**
   * console_templates/enable_user_risk_score.console
   * Step 9 create Transform: ml_userriskscore_latest_transform_{spaceId}
   */
  await createTransform({
    http,
    errorMessage: `${INSTALLATION_ERROR} - Transform creation failed`,
    transformId: getRiskScoreLatestTransformId(RiskScoreModuleName.User, spaceId),
    options: getCreateLatestTransformOptions({ spaceId, moduleName: RiskScoreModuleName.User }),
  });
  /**
   * console_templates/enable_user_risk_score.console
   * Step 7 Start the pivot transform
   * Step 10 Start the latest transform
   */
  await startTransforms({
    http,
    errorMessage: `${INSTALLATION_ERROR} - Failed to start Transforms`,
    transformIds: [
      getRiskScorePivotTransformId(RiskScoreModuleName.User, spaceId),
      getRiskScoreLatestTransformId(RiskScoreModuleName.User, spaceId),
    ],
  });
};

export const uninstallRiskScoreModule = async ({
  http,
  notifications,
  spaceId = 'default',
  moduleName,
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  spaceId?: string;
  moduleName: RiskScoreModuleName;
}) => {
  const transformIds = [
    getRiskScorePivotTransformId(moduleName, spaceId),
    getRiskScoreLatestTransformId(moduleName, spaceId),
  ];
  await deleteTransforms({
    http,
    notifications,
    errorMessage: `${UNINSTALLATION_ERROR} - ${TRANSFORM_DELETION_ERROR_MESSAGE(
      transformIds.length
    )}`,
    transformIds,
    options: {
      deleteDestIndex: true,
      deleteDestDataView: true,
      forceDelete: false,
    },
  });
  const names = getIngestPipelineName(moduleName);
  const count = names.split(',').length;

  await deleteIngestPipelines({
    http,
    notifications,
    errorMessage: `${UNINSTALLATION_ERROR} - ${INGEST_PIPELINE_DELETION_ERROR_MESSAGE(count)}`,
    names,
  });
};

export const upgradeHostRiskScoreModule = async ({
  http,
  notifications,
  spaceId = 'default',
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  spaceId?: string;
}) => {
  await uninstallRiskScoreModule({
    http,
    notifications,
    spaceId,
    moduleName: RiskScoreModuleName.Host,
  });
  await installHostRiskScoreModule({
    http,
    notifications,
    spaceId,
  });
};

export const upgradeUserRiskScoreModule = async ({
  http,
  notifications,
  spaceId = 'default',
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  spaceId?: string;
}) => {
  await uninstallRiskScoreModule({
    http,
    notifications,
    spaceId,
    moduleName: RiskScoreModuleName.User,
  });
  await installUserRiskScoreModule({
    http,
    notifications,
    spaceId,
  });
};

export const restartRiskScoreTransforms = async ({
  http,
  notifications,
  spaceId,
  callback,
  moduleName,
}: {
  http: HttpSetup;
  notifications?: NotificationsStart;
  spaceId?: string;
  callback: () => void;
  moduleName: RiskScoreModuleName;
}) => {
  const transformIds = [
    getRiskScorePivotTransformId(moduleName, spaceId),
    getRiskScoreLatestTransformId(moduleName, spaceId),
  ];

  await stopTransforms({
    http,
    notifications,
    transformIds,
    callback: () => {
      console.log(' transforms stopped');
    },
  });

  const res = await startTransforms({
    http,
    notifications,
    transformIds,
    callback: () => {
      console.log(' transforms started');
    },
  });

  return res;
};
