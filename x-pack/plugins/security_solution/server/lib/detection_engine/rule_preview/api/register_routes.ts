/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';

import type { ConfigType } from '../../../../config';
import type { SetupPlugins, StartPlugins } from '../../../../plugin_contract';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { CreateRuleOptions, CreateSecurityRuleTypeWrapperProps } from '../../rule_types/types';

import { previewRulesRoute } from './preview_rules/route';

export const registerRulePreviewRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  ml: SetupPlugins['ml'],
  security: SetupPlugins['security'],
  ruleOptions: CreateRuleOptions,
  securityRuleTypeOptions: CreateSecurityRuleTypeWrapperProps,
  previewRuleDataClient: IRuleDataClient,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  previewRulesRoute(
    router,
    config,
    ml,
    security,
    ruleOptions,
    securityRuleTypeOptions,
    previewRuleDataClient,
    getStartServices
  );
};
