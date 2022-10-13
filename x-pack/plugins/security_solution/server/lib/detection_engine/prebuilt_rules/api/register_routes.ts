/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigType } from '../../../../config';
import type { SetupPlugins } from '../../../../plugin_contract';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import { addPrepackedRulesRoute } from './add_prepackaged_rules/route';
import { getPrepackagedRulesStatusRoute } from './get_prepackaged_rules_status/route';

export const registerPrebuiltRulesRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  addPrepackedRulesRoute(router);
  getPrepackagedRulesStatusRoute(router, config, security);
};
