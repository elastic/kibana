/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerUpdateInsightsRoute } from './update_insight';
import { registerCreateInsightsRoute } from './create_insights';
import { registerGetInsightsRoute } from './get_insights';
import { registerGetPendingInsightsRoute } from './get_pending_insights';
import type { SecuritySolutionPluginRouter } from '../../../types';
import type { ConfigType } from '../../..';
import type { EndpointAppContext } from '../../types';

export const registerWorkflowInsightsRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  endpointContext: EndpointAppContext
) => {
  if (config.experimentalFeatures.defendInsights) {
    registerCreateInsightsRoute(router, endpointContext);
    registerGetPendingInsightsRoute(router, endpointContext);
    registerGetInsightsRoute(router, endpointContext);
    registerUpdateInsightsRoute(router, endpointContext);
  }
};
