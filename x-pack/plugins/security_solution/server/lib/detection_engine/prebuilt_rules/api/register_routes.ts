/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigType } from '../../../../config';
import type { SetupPlugins } from '../../../../plugin_contract';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import { getPrebuiltRulesAndTimelinesStatusRoute } from './get_prebuilt_rules_and_timelines_status/route';
import { getPrebuiltRulesStatusRoute } from './get_prebuilt_rules_status/route';
import { installPrebuiltRulesAndTimelinesRoute } from './install_prebuilt_rules_and_timelines/route';
import { generateAssetsRoute } from './generate_assets/route';
import { reviewRuleInstallationRoute } from './review_rule_installation/route';
import { reviewRuleUpgradeRoute } from './review_rule_upgrade/route';

export const registerPrebuiltRulesRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  const { prebuiltRulesNewUpgradeAndInstallationWorkflowsEnabled } = config.experimentalFeatures;

  // Legacy endpoints that we're going to deprecate
  getPrebuiltRulesAndTimelinesStatusRoute(router, security);
  installPrebuiltRulesAndTimelinesRoute(router);

  if (prebuiltRulesNewUpgradeAndInstallationWorkflowsEnabled) {
    // New endpoints for the rule upgrade and installation workflows
    getPrebuiltRulesStatusRoute(router);
    reviewRuleInstallationRoute(router);
    reviewRuleUpgradeRoute(router);

    // Helper endpoints for development and testing. Should be removed later.
    generateAssetsRoute(router);
  }
};
