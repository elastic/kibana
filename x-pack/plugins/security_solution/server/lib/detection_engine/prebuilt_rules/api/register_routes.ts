/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetupPlugins } from '../../../../plugin_contract';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import { getPrebuiltRulesAndTimelinesStatusRoute } from './get_prebuilt_rules_and_timelines_status/route';
import { installPrebuiltRulesAndTimelinesRoute } from './install_prebuilt_rules_and_timelines/route';

export const registerPrebuiltRulesRoutes = (
  router: SecuritySolutionPluginRouter,
  security: SetupPlugins['security']
) => {
  getPrebuiltRulesAndTimelinesStatusRoute(router, security);
  installPrebuiltRulesAndTimelinesRoute(router);
};
