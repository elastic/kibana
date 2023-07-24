/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import type { RuleVersions } from '../diff/calculate_rule_diff';

export const zipRuleVersions = (
  installedRules: RuleResponse[],
  baseRules: PrebuiltRuleAsset[],
  latestRules: PrebuiltRuleAsset[]
): Map<string, RuleVersions> => {
  const baseRulesMap = new Map(baseRules.map((r) => [r.rule_id, r]));
  const latestRulesMap = new Map(latestRules.map((r) => [r.rule_id, r]));
  const currentRulesMap = new Map(installedRules.map((r) => [r.rule_id, r]));

  const uniqueRuleIds = new Set([
    ...Array.from(baseRulesMap.keys()),
    ...Array.from(latestRulesMap.keys()),
    ...Array.from(currentRulesMap.keys()),
  ]);

  return new Map(
    [...uniqueRuleIds].map((ruleId) => {
      const base = baseRulesMap.get(ruleId);
      const target = latestRulesMap.get(ruleId);
      const current = currentRulesMap.get(ruleId);

      return [
        ruleId,
        {
          current,
          base,
          target,
        },
      ];
    })
  );
};
