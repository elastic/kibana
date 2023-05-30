/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigType } from '../../../../config';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../types';
import type { IPrebuiltRuleAssetsClient } from './rule_assets/prebuilt_rule_assets_client';
import { installPrebuiltRulesPackage } from '../api/install_prebuilt_rules_and_timelines/install_prebuilt_rules_package';

export async function ensureLatestRulesPackageInstalled(
  ruleAssetsClient: IPrebuiltRuleAssetsClient,
  config: ConfigType,
  securityContext: SecuritySolutionApiRequestHandlerContext
) {
  let latestPrebuiltRules = await ruleAssetsClient.fetchLatestAssets();
  if (latestPrebuiltRules.length === 0) {
    // Seems no packages with prepackaged rules were installed, try to install the default rules package
    await installPrebuiltRulesPackage(config, securityContext);

    // Try to get the prepackaged rules again
    latestPrebuiltRules = await ruleAssetsClient.fetchLatestAssets();
  }
  return latestPrebuiltRules;
}
