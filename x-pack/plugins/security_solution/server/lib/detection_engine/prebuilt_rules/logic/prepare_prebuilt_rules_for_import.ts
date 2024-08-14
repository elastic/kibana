/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../types';
import type { RuleToImport } from '../../../../../common/api/detection_engine';
import type { ConfigType } from '../../../../config';
import type { PrebuiltRuleAsset } from '../model/rule_assets/prebuilt_rule_asset';
import { createPrebuiltRuleAssetsClient } from './rule_assets/prebuilt_rule_assets_client';
import { ensureLatestRulesPackageInstalled } from './ensure_latest_rules_package_installed';

/**
 *
 * Prepares the system to import prebuilt rules by ensuring the latest rules
 * package is installed and fetching the corresponding prebuilt rule assets from the package.
 * @param rules - The rules to be imported
 *
 * @returns The prebuilt rule assets corresponding to the specified prebuilt
 * rules, which are used to determine how to import those rules (create vs. update, etc.).
 */
export const preparePrebuiltRuleAssetsForImport = async ({
  savedObjectsClient,
  config,
  context,
  rules,
}: {
  config: ConfigType;
  context: SecuritySolutionApiRequestHandlerContext;
  savedObjectsClient: SavedObjectsClientContract;
  rules: Array<RuleToImport | Error>;
}): Promise<PrebuiltRuleAsset[]> => {
  if (!config.experimentalFeatures.prebuiltRulesCustomizationEnabled) {
    return [];
  }

  const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
  await ensureLatestRulesPackageInstalled(ruleAssetsClient, config, context);

  const prebuiltRulesToImport = rules.flatMap((rule) => {
    if (rule instanceof Error || rule.version == null) {
      return [];
    }
    return {
      rule_id: rule.rule_id,
      version: rule.version,
    };
  });

  return ruleAssetsClient.fetchAssetsByVersion(prebuiltRulesToImport);
};
