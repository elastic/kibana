/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreEntity } from './common';

export const getRiskScoreLevelScriptId = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_levels_script_${spaceId}`;
export const getRiskScoreInitScriptId = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_init_script_${spaceId}`;
export const getRiskScoreMapScriptId = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_map_script_${spaceId}`;
export const getRiskScoreReduceScriptId = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_reduce_script_${spaceId}`;

export const getLegacyRiskScoreLevelScriptId = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_levels_script`;
export const getLegacyRiskScoreInitScriptId = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_init_script`;
export const getLegacyRiskScoreMapScriptId = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_map_script`;
export const getLegacyRiskScoreReduceScriptId = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_reduce_script`;

export const getLegacyRiskHostCreateLevelScriptOptions = (version = '8.4') => {
  const source =
    "double risk_score = (def)ctx.getByPath(params.risk_score);\nif (risk_score < 20) {\n    ctx['risk'] = 'Unknown'\n}\nelse if (risk_score >= 20 && risk_score < 40) {\n    ctx['risk'] = 'Low'\n}\nelse if (risk_score >= 40 && risk_score < 70) {\n    ctx['risk'] = 'Moderate'\n}\nelse if (risk_score >= 70 && risk_score < 90) {\n    ctx['risk'] = 'High'\n}\nelse if (risk_score >= 90) {\n    ctx['risk'] = 'Critical'\n}";
  return {
    id:
      version === '8.4'
        ? getLegacyRiskScoreLevelScriptId(RiskScoreEntity.host)
        : getRiskScoreLevelScriptId(RiskScoreEntity.host),
    script: {
      lang: 'painless',
      source,
    },
  };
};

export const getLegacyRiskHostCreateInitScriptOptions = (version = '8.4') => {
  const source =
    'state.rule_risk_stats = new HashMap();\nstate.host_variant_set = false;\nstate.host_variant = new String();\nstate.tactic_ids = new HashSet();';
  return {
    id:
      version === '8.4'
        ? getLegacyRiskScoreInitScriptId(RiskScoreEntity.host)
        : getRiskScoreInitScriptId(RiskScoreEntity.host),
    script: {
      lang: 'painless',
      source,
    },
  };
};

export const getLegacyRiskHostCreateMapScriptOptions = (version = '8.4') => {
  const source =
    '// Get the host variant\nif (state.host_variant_set == false) {\n    if (doc.containsKey("host.os.full") && doc["host.os.full"].size() != 0) {\n        state.host_variant = doc["host.os.full"].value;\n        state.host_variant_set = true;\n    }\n}\n// Aggregate all the tactics seen on the host\nif (doc.containsKey("signal.rule.threat.tactic.id") && doc["signal.rule.threat.tactic.id"].size() != 0) {\n    state.tactic_ids.add(doc["signal.rule.threat.tactic.id"].value);\n}\n// Get running sum of time-decayed risk score per rule name per shard\nString rule_name = doc["signal.rule.name"].value;\ndef stats = state.rule_risk_stats.getOrDefault(rule_name, [0.0,"",false]);\nint time_diff = (int)((System.currentTimeMillis() - doc["@timestamp"].value.toInstant().toEpochMilli()) / (1000.0 * 60.0 * 60.0));\ndouble risk_derate = Math.min(1, Math.exp((params.lookback_time - time_diff) / params.time_decay_constant));\nstats[0] = Math.max(stats[0], doc["signal.rule.risk_score"].value * risk_derate);\nif (stats[2] == false) {\n    stats[1] = doc["kibana.alert.rule.uuid"].value;\n    stats[2] = true;\n}\nstate.rule_risk_stats.put(rule_name, stats);';
  return {
    id:
      version === '8.4'
        ? getLegacyRiskScoreMapScriptId(RiskScoreEntity.host)
        : getRiskScoreMapScriptId(RiskScoreEntity.host),
    script: {
      lang: 'painless',
      source,
    },
  };
};

export const getLegacyRiskHostCreateReduceScriptOptions = (version = '8.4') => {
  const source =
    '// Consolidating time decayed risks and tactics from across all shards\nMap total_risk_stats = new HashMap();\nString host_variant = new String();\ndef tactic_ids = new HashSet();\nfor (state in states) {\n    for (key in state.rule_risk_stats.keySet()) {\n        def rule_stats = state.rule_risk_stats.get(key);\n        def stats = total_risk_stats.getOrDefault(key, [0.0,"",false]);\n        stats[0] = Math.max(stats[0], rule_stats[0]);\n        if (stats[2] == false) {\n            stats[1] = rule_stats[1];\n            stats[2] = true;\n        } \n        total_risk_stats.put(key, stats);\n    }\n    if (host_variant.length() == 0) {\n        host_variant = state.host_variant;\n    }\n    tactic_ids.addAll(state.tactic_ids);\n}\n// Consolidating individual rule risks and arranging them in decreasing order\nList risks = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n    risks.add(total_risk_stats[key][0])\n}\nCollections.sort(risks, Collections.reverseOrder());\n// Calculating total host risk score\ndouble total_risk = 0.0;\ndouble risk_cap = params.max_risk * params.zeta_constant;\nfor (int i=0;i<risks.length;i++) {\n    total_risk += risks[i] / Math.pow((1+i), params.p);\n}\n// Normalizing the host risk score\ndouble total_norm_risk = 100 * total_risk / risk_cap;\nif (total_norm_risk < 40) {\n    total_norm_risk =  2.125 * total_norm_risk;\n}\nelse if (total_norm_risk >= 40 && total_norm_risk < 50) {\n    total_norm_risk = 85 + (total_norm_risk - 40);\n}\nelse {\n    total_norm_risk = 95 + (total_norm_risk - 50) / 10;\n}\n// Calculating multipliers to the host risk score\ndouble risk_multiplier = 1.0;\nList multipliers = new ArrayList();\n// Add a multiplier if host is a server\nif (host_variant.toLowerCase().contains("server")) {\n    risk_multiplier *= params.server_multiplier;\n    multipliers.add("Host is a server");\n}\n// Add multipliers based on number and diversity of tactics seen on the host\nfor (String tactic : tactic_ids) {\n    multipliers.add("Tactic "+tactic);\n    risk_multiplier *= 1 + params.tactic_base_multiplier * params.tactic_weights.getOrDefault(tactic, 0);\n}\n// Calculating final risk\ndouble final_risk = total_norm_risk;\nif (risk_multiplier > 1.0) {\n    double prior_odds = (total_norm_risk) / (100 - total_norm_risk);\n    double updated_odds = prior_odds * risk_multiplier; \n    final_risk = 100 * updated_odds / (1 + updated_odds);\n}\n// Adding additional metadata\nList rule_stats = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n    Map temp = new HashMap();\n    temp["rule_name"] = key;\n    temp["rule_risk"] = total_risk_stats[key][0];\n    temp["rule_id"] = total_risk_stats[key][1];\n    rule_stats.add(temp);\n}\n\nreturn ["calculated_score_norm": final_risk, "rule_risks": rule_stats, "multipliers": multipliers];';
  return {
    id:
      version === '8.4'
        ? getLegacyRiskScoreReduceScriptId(RiskScoreEntity.host)
        : getRiskScoreReduceScriptId(RiskScoreEntity.host),
    script: {
      lang: 'painless',
      source,
    },
  };
};

export const getLegacyRiskUserCreateLevelScriptOptions = (version = '8.4') => {
  const source =
    "double risk_score = (def)ctx.getByPath(params.risk_score);\nif (risk_score < 20) {\n  ctx['risk'] = 'Unknown'\n}\nelse if (risk_score >= 20 && risk_score < 40) {\n  ctx['risk'] = 'Low'\n}\nelse if (risk_score >= 40 && risk_score < 70) {\n  ctx['risk'] = 'Moderate'\n}\nelse if (risk_score >= 70 && risk_score < 90) {\n  ctx['risk'] = 'High'\n}\nelse if (risk_score >= 90) {\n  ctx['risk'] = 'Critical'\n}";
  return {
    id:
      version === '8.4'
        ? getLegacyRiskScoreLevelScriptId(RiskScoreEntity.user)
        : getRiskScoreLevelScriptId(RiskScoreEntity.user),
    script: {
      lang: 'painless',
      source,
    },
  };
};

export const getLegacyRiskUserCreateMapScriptOptions = (version = '8.4') => {
  const source =
    '// Get running sum of risk score per rule name per shard\\\\\nString rule_name = doc["signal.rule.name"].value;\ndef stats = state.rule_risk_stats.getOrDefault(rule_name, 0.0);\nstats = doc["signal.rule.risk_score"].value;\nstate.rule_risk_stats.put(rule_name, stats);';
  return {
    id:
      version === '8.4'
        ? getLegacyRiskScoreMapScriptId(RiskScoreEntity.user)
        : getRiskScoreMapScriptId(RiskScoreEntity.user),
    script: {
      lang: 'painless',
      source,
    },
  };
};

export const getLegacyRiskUserCreateReduceScriptOptions = (version = '8.4') => {
  const source =
    '// Consolidating time decayed risks from across all shards\nMap total_risk_stats = new HashMap();\nfor (state in states) {\n    for (key in state.rule_risk_stats.keySet()) {\n    def rule_stats = state.rule_risk_stats.get(key);\n    def stats = total_risk_stats.getOrDefault(key, 0.0);\n    stats = rule_stats;\n    total_risk_stats.put(key, stats);\n    }\n}\n// Consolidating individual rule risks and arranging them in decreasing order\nList risks = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n    risks.add(total_risk_stats[key])\n}\nCollections.sort(risks, Collections.reverseOrder());\n// Calculating total risk and normalizing it to a range\ndouble total_risk = 0.0;\ndouble risk_cap = params.max_risk * params.zeta_constant;\nfor (int i=0;i<risks.length;i++) {\n    total_risk += risks[i] / Math.pow((1+i), params.p);\n}\ndouble total_norm_risk = 100 * total_risk / risk_cap;\nif (total_norm_risk < 40) {\n    total_norm_risk =  2.125 * total_norm_risk;\n}\nelse if (total_norm_risk >= 40 && total_norm_risk < 50) {\n    total_norm_risk = 85 + (total_norm_risk - 40);\n}\nelse {\n    total_norm_risk = 95 + (total_norm_risk - 50) / 10;\n}\n\nList rule_stats = new ArrayList();\nfor (key in total_risk_stats.keySet()) {\n    Map temp = new HashMap();\n    temp["rule_name"] = key;\n    temp["rule_risk"] = total_risk_stats[key];\n    rule_stats.add(temp);\n}\n\nreturn ["risk_score": total_norm_risk, "rule_risks": rule_stats];';
  return {
    id:
      version === '8.4'
        ? getLegacyRiskScoreReduceScriptId(RiskScoreEntity.user)
        : getRiskScoreReduceScriptId(RiskScoreEntity.user),
    script: {
      lang: 'painless',
      source,
    },
  };
};
