/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleVersions } from '../diff/calculate_rule_diff';
import type { IPrebuiltRuleAssetsClient } from '../rule_assets/prebuilt_rule_assets_client';
import type { IPrebuiltRuleObjectsClient } from '../rule_objects/prebuilt_rule_objects_client';
import type { RuleVersionSpecifier } from '../../model/rule_versions/rule_version_specifier';
import { zipRuleVersions } from './zip_rule_versions';

interface GetRuleVersionsMapArgs {
  ruleObjectsClient: IPrebuiltRuleObjectsClient;
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  versionSpecifiers?: RuleVersionSpecifier[];
}

export async function fetchRuleVersionsTriad({
  ruleObjectsClient,
  ruleAssetsClient,
  versionSpecifiers,
}: GetRuleVersionsMapArgs): Promise<Map<string, RuleVersions>> {
  const [currentRules, latestRules] = await Promise.all([
    versionSpecifiers
      ? ruleObjectsClient.fetchInstalledRulesByIds(
          versionSpecifiers.map(({ rule_id: ruleId }) => ruleId)
        )
      : ruleObjectsClient.fetchAllInstalledRules(),
    versionSpecifiers
      ? ruleAssetsClient.fetchAssetsByVersion(versionSpecifiers)
      : ruleAssetsClient.fetchLatestAssets(),
  ]);
  const baseRules = await ruleAssetsClient.fetchAssetsByVersion(currentRules);
  return zipRuleVersions(currentRules, baseRules, latestRules);
}
