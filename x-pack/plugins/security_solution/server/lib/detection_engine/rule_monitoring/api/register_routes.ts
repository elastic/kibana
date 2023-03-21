/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionPluginRouter } from '../../../../types';
import { getRuleExecutionEventsRoute } from './get_rule_execution_events/route';
import { getRuleExecutionResultsRoute } from './get_rule_execution_results/route';

export const registerRuleMonitoringRoutes = (router: SecuritySolutionPluginRouter) => {
  getRuleExecutionEventsRoute(router);
  getRuleExecutionResultsRoute(router);
};
