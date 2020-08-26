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

import { IRouter } from 'src/core/server';
import { PLUGIN_ID, AGENT_API_ROUTES, LIMITED_CONCURRENCY_ROUTE_TAG } from '../../constants';
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
  PostNewAgentActionRequestSchema,
  PutAgentReassignRequestSchema,
} from '../../types';
import {
  getAgentsHandler,
  getAgentHandler,
  updateAgentHandler,
  deleteAgentHandler,
  getAgentEventsHandler,
  postAgentCheckinHandler,
  postAgentEnrollHandler,
  getAgentStatusForAgentPolicyHandler,
  putAgentsReassignHandler,
} from './handlers';
import { postAgentAcksHandlerBuilder } from './acks_handlers';
import * as AgentService from '../../services/agents';
import { postNewAgentActionHandlerBuilder } from './actions_handlers';
import { appContextService } from '../../services';
import { postAgentsUnenrollHandler } from './unenroll_handler';

export const registerRoutes = (router: IRouter) => {
  // Get one
  router.get(
    {
      path: AGENT_API_ROUTES.INFO_PATTERN,
      validate: GetOneAgentRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getAgentHandler
  );
  // Update
  router.put(
    {
      path: AGENT_API_ROUTES.UPDATE_PATTERN,
      validate: UpdateAgentRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    updateAgentHandler
  );
  // Delete
  router.delete(
    {
      path: AGENT_API_ROUTES.DELETE_PATTERN,
      validate: DeleteAgentRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    deleteAgentHandler
  );
  // List
  router.get(
    {
      path: AGENT_API_ROUTES.LIST_PATTERN,
      validate: GetAgentsRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getAgentsHandler
  );

  // Agent checkin
  router.post(
    {
      path: AGENT_API_ROUTES.CHECKIN_PATTERN,
      validate: PostAgentCheckinRequestSchema,
      options: { tags: [] },
    },
    postAgentCheckinHandler
  );

  // Agent enrollment
  router.post(
    {
      path: AGENT_API_ROUTES.ENROLL_PATTERN,
      validate: PostAgentEnrollRequestSchema,
      options: { tags: [LIMITED_CONCURRENCY_ROUTE_TAG] },
    },
    postAgentEnrollHandler
  );

  // Agent acks
  router.post(
    {
      path: AGENT_API_ROUTES.ACKS_PATTERN,
      validate: PostAgentAcksRequestSchema,
      options: { tags: [LIMITED_CONCURRENCY_ROUTE_TAG] },
    },
    postAgentAcksHandlerBuilder({
      acknowledgeAgentActions: AgentService.acknowledgeAgentActions,
      authenticateAgentWithAccessToken: AgentService.authenticateAgentWithAccessToken,
      getSavedObjectsClientContract: appContextService.getInternalUserSOClient.bind(
        appContextService
      ),
      saveAgentEvents: AgentService.saveAgentEvents,
    })
  );

  // Agent actions
  router.post(
    {
      path: AGENT_API_ROUTES.ACTIONS_PATTERN,
      validate: PostNewAgentActionRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    postNewAgentActionHandlerBuilder({
      getAgent: AgentService.getAgent,
      createAgentAction: AgentService.createAgentAction,
    })
  );

  router.post(
    {
      path: AGENT_API_ROUTES.UNENROLL_PATTERN,
      validate: PostAgentUnenrollRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    postAgentsUnenrollHandler
  );

  router.put(
    {
      path: AGENT_API_ROUTES.REASSIGN_PATTERN,
      validate: PutAgentReassignRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    putAgentsReassignHandler
  );

  // Get agent events
  router.get(
    {
      path: AGENT_API_ROUTES.EVENTS_PATTERN,
      validate: GetOneAgentEventsRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getAgentEventsHandler
  );

  // Get agent status for policy
  router.get(
    {
      path: AGENT_API_ROUTES.STATUS_PATTERN,
      validate: GetAgentStatusRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getAgentStatusForAgentPolicyHandler
  );
};
