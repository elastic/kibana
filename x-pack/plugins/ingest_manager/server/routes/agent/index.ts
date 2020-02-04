/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { PLUGIN_ID, AGENT_API_ROUTES } from '../../constants';
import {
  GetAgentsRequestSchema,
  GetOneAgentRequestSchema,
  UpdateAgentRequestSchema,
} from '../../types';
import { getAgentsHandler, getAgentHandler } from './handlers';

export const registerRoutes = (router: IRouter) => {
  // Get one
  router.get(
    {
      path: AGENT_API_ROUTES.INFO_PATTERN,
      validate: GetOneAgentRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getAgentHandler
  );
  // Update
  router.put(
    {
      path: AGENT_API_ROUTES.UPDATE_PATTERN,
      validate: UpdateAgentRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    updateAgentHandler
  );
  // List
  router.get(
    {
      path: AGENT_API_ROUTES.LIST_PATTERN,
      validate: GetAgentsRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getAgentsHandler
  );
};
