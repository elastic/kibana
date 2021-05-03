/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from 'src/core/server';

import { PLUGIN_ID, AGENT_API_ROUTES } from '../../constants';
import {
  GetAgentsRequestSchema,
  GetOneAgentRequestSchema,
  GetOneAgentEventsRequestSchema,
  UpdateAgentRequestSchema,
  DeleteAgentRequestSchema,
  PostAgentUnenrollRequestSchema,
  PostBulkAgentUnenrollRequestSchema,
  GetAgentStatusRequestSchema,
  PostNewAgentActionRequestSchema,
  PutAgentReassignRequestSchema,
  PostBulkAgentReassignRequestSchema,
  PostAgentUpgradeRequestSchema,
  PostBulkAgentUpgradeRequestSchema,
} from '../../types';
import * as AgentService from '../../services/agents';
import type { FleetConfigType } from '../..';

import {
  getAgentsHandler,
  getAgentHandler,
  updateAgentHandler,
  deleteAgentHandler,
  getAgentEventsHandler,
  getAgentStatusForAgentPolicyHandler,
  putAgentsReassignHandler,
  postBulkAgentsReassignHandler,
} from './handlers';
import { postNewAgentActionHandlerBuilder } from './actions_handlers';
import { postAgentUnenrollHandler, postBulkAgentsUnenrollHandler } from './unenroll_handler';
import { postAgentUpgradeHandler, postBulkAgentsUpgradeHandler } from './upgrade_handler';

export const registerAPIRoutes = (router: IRouter, config: FleetConfigType) => {
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

  // Agent actions
  router.post(
    {
      path: AGENT_API_ROUTES.ACTIONS_PATTERN,
      validate: PostNewAgentActionRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    postNewAgentActionHandlerBuilder({
      getAgent: AgentService.getAgentById,
      createAgentAction: AgentService.createAgentAction,
    })
  );

  router.post(
    {
      path: AGENT_API_ROUTES.UNENROLL_PATTERN,
      validate: PostAgentUnenrollRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    postAgentUnenrollHandler
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
  // upgrade agent
  router.post(
    {
      path: AGENT_API_ROUTES.UPGRADE_PATTERN,
      validate: PostAgentUpgradeRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    postAgentUpgradeHandler
  );
  // bulk upgrade
  router.post(
    {
      path: AGENT_API_ROUTES.BULK_UPGRADE_PATTERN,
      validate: PostBulkAgentUpgradeRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    postBulkAgentsUpgradeHandler
  );
  // Bulk reassign
  router.post(
    {
      path: AGENT_API_ROUTES.BULK_REASSIGN_PATTERN,
      validate: PostBulkAgentReassignRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    postBulkAgentsReassignHandler
  );

  // Bulk unenroll
  router.post(
    {
      path: AGENT_API_ROUTES.BULK_UNENROLL_PATTERN,
      validate: PostBulkAgentUnenrollRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    postBulkAgentsUnenrollHandler
  );
};
