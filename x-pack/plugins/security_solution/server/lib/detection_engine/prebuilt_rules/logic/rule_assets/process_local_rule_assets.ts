/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';

export const processLocalRuleAssets = (
  installedRuleAssets: PrebuiltRuleAsset[],
  ruleAssetsMap: Map<string, PrebuiltRuleAsset>
): { rulesToInstall: PrebuiltRuleAsset[]; rulesToUpgrade: PrebuiltRuleAsset[] } => {
  const rulesToInstall: PrebuiltRuleAsset[] = [];
  const rulesToUpgrade: PrebuiltRuleAsset[] = [];
  const installedRuleMap = new Map(installedRuleAssets.map((rule) => [rule.rule_id, rule]));

  for (const [filename, ruleAsset] of ruleAssetsMap) {
    const [ruleId, versionFromFilename] = filename.split('_');

    if (ruleAsset.version !== parseInt(versionFromFilename, 10)) {
      throw new Error(
        `Version mismatch for rule ${ruleId}: filename version ${versionFromFilename} does not match rule version ${ruleAsset.version}`
      );
    }

    const installedRule = installedRuleMap.get(ruleId);

    if (!installedRule) {
      rulesToInstall.push(ruleAsset);
    } else if (ruleAsset.version > installedRule.version) {
      rulesToUpgrade.push(ruleAsset);
    }
  }

  return { rulesToInstall, rulesToUpgrade };
};
