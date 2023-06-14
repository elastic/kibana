/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigType } from '../../../../config';
import type { SetupPlugins } from '../../../../plugin_contract';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import { getPrebuiltRulesAndTimelinesStatusRoute } from './get_prebuilt_rules_and_timelines_status/get_prebuilt_rules_and_timelines_status_route';
import { getPrebuiltRulesStatusRoute } from './get_prebuilt_rules_status/get_prebuilt_rules_status_route';
import { installPrebuiltRulesAndTimelinesRoute } from './install_prebuilt_rules_and_timelines/install_prebuilt_rules_and_timelines_route';
import { generateAssetsRoute } from './generate_assets/generate_assets_route';
import { reviewRuleInstallationRoute } from './review_rule_installation/review_rule_installation_route';
import { reviewRuleUpgradeRoute } from './review_rule_upgrade/review_rule_upgrade_route';
import { performRuleInstallationRoute } from './perform_rule_installation/perform_rule_installation_route';
import { performRuleUpgradeRoute } from './perform_rule_upgrade/perform_rule_upgrade_route';

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
    performRuleInstallationRoute(router);
    performRuleUpgradeRoute(router);
    reviewRuleInstallationRoute(router);
    reviewRuleUpgradeRoute(router);

    // Helper endpoints for development and testing. Should be removed later.
    generateAssetsRoute(router);
  }
};
