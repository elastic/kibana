/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionPluginRouter } from '../../../../types';
import { getRuleExecutionResultsRoute } from '../../generated_routes/get_rule_execution_results/get_rule_execution_results_route.gen';
import { getRuleExecutionEventsRoute } from './get_rule_execution_events/route';

export const registerRuleMonitoringRoutes = (router: SecuritySolutionPluginRouter) => {
  getRuleExecutionEventsRoute(router);
  getRuleExecutionResultsRoute(router);
};
