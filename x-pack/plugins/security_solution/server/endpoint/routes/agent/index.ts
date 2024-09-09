/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerAgentStatusRoute } from './agent_status_handler';
import type { SecuritySolutionPluginRouter } from '../../../types';
import type { EndpointAppContext } from '../../types';

export const registerAgentRoutes = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  registerAgentStatusRoute(router, endpointContext);
};
