/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'kibana/server';
import { PLUGIN_ID, AGENT_CONFIG_API_ROUTES } from '../../constants';
import {
  GetAgentConfigsRequestSchema,
  GetOneAgentConfigRequestSchema,
  CreateAgentConfigRequestSchema,
  UpdateAgentConfigRequestSchema,
  DeleteAgentConfigsRequestSchema,
} from '../../types';
import {
  getAgentConfigsHandler,
  getOneAgentConfigHandler,
  createAgentConfigHandler,
  updateAgentConfigHandler,
  deleteAgentConfigsHandler,
} from './handlers';

export const registerRoutes = (router: IRouter) => {
  // List
  router.get(
    {
      path: AGENT_CONFIG_API_ROUTES.LIST_PATTERN,
      validate: GetAgentConfigsRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getAgentConfigsHandler
  );

  // Get one
  router.get(
    {
      path: AGENT_CONFIG_API_ROUTES.INFO_PATTERN,
      validate: GetOneAgentConfigRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getOneAgentConfigHandler
  );

  // Create
  router.post(
    {
      path: AGENT_CONFIG_API_ROUTES.CREATE_PATTERN,
      validate: CreateAgentConfigRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    createAgentConfigHandler
  );

  // Update
  router.put(
    {
      path: AGENT_CONFIG_API_ROUTES.UPDATE_PATTERN,
      validate: UpdateAgentConfigRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    updateAgentConfigHandler
  );

  // Delete
  router.post(
    {
      path: AGENT_CONFIG_API_ROUTES.DELETE_PATTERN,
      validate: DeleteAgentConfigsRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    deleteAgentConfigsHandler
  );
};
