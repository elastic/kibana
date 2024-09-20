/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import type { IPrebuiltRuleAssetsClient } from '../rule_assets/prebuilt_rule_assets_client';
import type { RuleSpecifier } from './types';

/**
 * Retrieves the rule IDs (`rule_id`s) of available prebuilt rule assets matching those
 * of the specified rules. This information can be used to determine whether
 * the rule being imported is a custom rule or a prebuilt rule.
 *
 * @param rules - A list of {@link RuleSpecifier}s representing the rules being imported.
 * @param ruleAssetsClient - the {@link IPrebuiltRuleAssetsClient} to use for fetching the available rule assets.
 *
 * @returns A list of the prebuilt rule asset IDs that are available.
 *
 */
export const fetchAvailableRuleAssetIds = async ({
  rules,
  ruleAssetsClient,
}: {
  rules: RuleSpecifier[];
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
}): Promise<string[]> => {
  const incomingRuleIds = rules.map((rule) => rule.rule_id);
  const availableRuleAssets = await ruleAssetsClient.fetchLatestAssetsByRuleId(incomingRuleIds);

  return availableRuleAssets.map((asset) => asset.rule_id);
};

/**
 * Retrieves prebuilt rule assets for rules being imported. These
 * assets can be compared to the incoming rules for the purposes of calculating
 * appropriate `rule_source` values.
 *
 * @param rules - A list of {@link RuleSpecifier}s representing the rules being imported.
 *
 * @returns The prebuilt rule assets matching the specified prebuilt
 * rules. Assets match the `rule_id` and `version` of the specified rules.
 * Because of this, there may be less assets returned than specified rules.
 */
export const fetchMatchingAssets = async ({
  rules,
  ruleAssetsClient,
}: {
  rules: RuleSpecifier[];
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
}): Promise<PrebuiltRuleAsset[]> => {
  const incomingRuleVersions = rules.flatMap((rule) => {
    if (rule.version == null) {
      return [];
    }
    return {
      rule_id: rule.rule_id,
      version: rule.version,
    };
  });

  return ruleAssetsClient.fetchAssetsByVersion(incomingRuleVersions);
};
