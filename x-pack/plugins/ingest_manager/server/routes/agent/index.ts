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
  GetOneAgentEventsRequestSchema,
  UpdateAgentRequestSchema,
  DeleteAgentRequestSchema,
  PostAgentCheckinRequestSchema,
  PostAgentEnrollRequestSchema,
  PostAgentAcksRequestSchema,
  PostAgentUnenrollRequestSchema,
  GetAgentStatusRequestSchema,
} from '../../types';
import {
  getAgentsHandler,
  getAgentHandler,
  updateAgentHandler,
  deleteAgentHandler,
  getAgentEventsHandler,
  postAgentCheckinHandler,
  postAgentEnrollHandler,
  postAgentAcksHandler,
  postAgentsUnenrollHandler,
  getAgentStatusForConfigHandler,
} from './handlers';

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
  // Delete
  router.delete(
    {
      path: AGENT_API_ROUTES.DELETE_PATTERN,
      validate: DeleteAgentRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    deleteAgentHandler
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

  // Agent checkin
  router.post(
    {
      path: AGENT_API_ROUTES.CHECKIN_PATTERN,
      validate: PostAgentCheckinRequestSchema,
      options: { tags: [], authRequired: false },
    },
    postAgentCheckinHandler
  );

  // Agent enrollment
  router.post(
    {
      path: AGENT_API_ROUTES.ENROLL_PATTERN,
      validate: PostAgentEnrollRequestSchema,
      options: { tags: [], authRequired: false },
    },
    postAgentEnrollHandler
  );

  // Agent acks
  router.post(
    {
      path: AGENT_API_ROUTES.ACKS_PATTERN,
      validate: PostAgentAcksRequestSchema,
      options: { tags: [], authRequired: false },
    },
    postAgentAcksHandler
  );

  router.post(
    {
      path: AGENT_API_ROUTES.UNENROLL_PATTERN,
      validate: PostAgentUnenrollRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    postAgentsUnenrollHandler
  );

  // Get agent events
  router.get(
    {
      path: AGENT_API_ROUTES.EVENTS_PATTERN,
      validate: GetOneAgentEventsRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getAgentEventsHandler
  );

  // Get agent status for config
  router.get(
    {
      path: AGENT_API_ROUTES.STATUS_FOR_CONFIG_PATTERN,
      validate: GetAgentStatusRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getAgentStatusForConfigHandler
  );
};
