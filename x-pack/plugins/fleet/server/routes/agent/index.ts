/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthz } from '../../../common';

import { getRouteRequiredAuthz, type FleetAuthzRouter } from '../../services/security';

import { AGENT_API_ROUTES } from '../../constants';
import {
  GetAgentsRequestSchema,
  GetTagsRequestSchema,
  GetOneAgentRequestSchema,
  UpdateAgentRequestSchema,
  DeleteAgentRequestSchema,
  PostAgentUnenrollRequestSchema,
  PostBulkAgentUnenrollRequestSchema,
  GetAgentStatusRequestSchema,
  GetAgentDataRequestSchema,
  PostNewAgentActionRequestSchema,
  PutAgentReassignRequestSchema,
  PostBulkAgentReassignRequestSchema,
  PostAgentUpgradeRequestSchema,
  PostBulkAgentUpgradeRequestSchema,
  PostCancelActionRequestSchema,
  GetActionStatusRequestSchema,
  PostRequestDiagnosticsActionRequestSchema,
  PostBulkRequestDiagnosticsActionRequestSchema,
  ListAgentUploadsRequestSchema,
  GetAgentUploadFileRequestSchema,
} from '../../types';
import * as AgentService from '../../services/agents';
import type { FleetConfigType } from '../..';

import { PostBulkUpdateAgentTagsRequestSchema } from '../../types/rest_spec/agent';

import { calculateRouteAuthz } from '../../services/security/security';

import {
  getAgentsHandler,
  getAgentTagsHandler,
  getAgentHandler,
  updateAgentHandler,
  deleteAgentHandler,
  getAgentStatusForAgentPolicyHandler,
  putAgentsReassignHandler,
  postBulkAgentsReassignHandler,
  getAgentDataHandler,
  bulkUpdateAgentTagsHandler,
  getAvailableVersionsHandler,
  getActionStatusHandler,
  getAgentUploadsHandler,
  getAgentUploadFileHandler,
} from './handlers';
import {
  postNewAgentActionHandlerBuilder,
  postCancelActionHandlerBuilder,
} from './actions_handlers';
import { postAgentUnenrollHandler, postBulkAgentsUnenrollHandler } from './unenroll_handler';
import { postAgentUpgradeHandler, postBulkAgentsUpgradeHandler } from './upgrade_handler';
import {
  bulkRequestDiagnosticsHandler,
  requestDiagnosticsHandler,
} from './request_diagnostics_handler';

export const registerAPIRoutes = (router: FleetAuthzRouter, config: FleetConfigType) => {
  // Get one
  router.get(
    {
      path: AGENT_API_ROUTES.INFO_PATTERN,
      validate: GetOneAgentRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getAgentHandler
  );
  // Update
  router.put(
    {
      path: AGENT_API_ROUTES.UPDATE_PATTERN,
      validate: UpdateAgentRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    updateAgentHandler
  );
  // Bulk Update Tags
  router.post(
    {
      path: AGENT_API_ROUTES.BULK_UPDATE_AGENT_TAGS_PATTERN,
      validate: PostBulkUpdateAgentTagsRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    bulkUpdateAgentTagsHandler
  );
  // Delete
  router.delete(
    {
      path: AGENT_API_ROUTES.DELETE_PATTERN,
      validate: DeleteAgentRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    deleteAgentHandler
  );
  // List
  router.get(
    {
      path: AGENT_API_ROUTES.LIST_PATTERN,
      validate: GetAgentsRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getAgentsHandler
  );
  // List Agent Tags
  router.get(
    {
      path: AGENT_API_ROUTES.LIST_TAGS_PATTERN,
      validate: GetTagsRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getAgentTagsHandler
  );

  // Agent actions
  router.post(
    {
      path: AGENT_API_ROUTES.ACTIONS_PATTERN,
      validate: PostNewAgentActionRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    postNewAgentActionHandlerBuilder({
      getAgent: AgentService.getAgentById,
      cancelAgentAction: AgentService.cancelAgentAction,
      createAgentAction: AgentService.createAgentAction,
      getAgentActions: AgentService.getAgentActions,
    })
  );

  router.post(
    {
      path: AGENT_API_ROUTES.CANCEL_ACTIONS_PATTERN,
      validate: PostCancelActionRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    postCancelActionHandlerBuilder({
      getAgent: AgentService.getAgentById,
      cancelAgentAction: AgentService.cancelAgentAction,
      createAgentAction: AgentService.createAgentAction,
      getAgentActions: AgentService.getAgentActions,
    })
  );

  router.post(
    {
      path: AGENT_API_ROUTES.UNENROLL_PATTERN,
      validate: PostAgentUnenrollRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    postAgentUnenrollHandler
  );

  router.put(
    {
      path: AGENT_API_ROUTES.REASSIGN_PATTERN,
      validate: PutAgentReassignRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    putAgentsReassignHandler
  );

  router.post(
    {
      path: AGENT_API_ROUTES.REQUEST_DIAGNOSTICS_PATTERN,
      validate: PostRequestDiagnosticsActionRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    requestDiagnosticsHandler
  );

  router.post(
    {
      path: AGENT_API_ROUTES.BULK_REQUEST_DIAGNOSTICS_PATTERN,
      validate: PostBulkRequestDiagnosticsActionRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    bulkRequestDiagnosticsHandler
  );

  router.get(
    {
      path: AGENT_API_ROUTES.LIST_UPLOADS_PATTERN,
      validate: ListAgentUploadsRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getAgentUploadsHandler
  );

  router.get(
    {
      path: AGENT_API_ROUTES.GET_UPLOAD_FILE_PATTERN,
      validate: GetAgentUploadFileRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getAgentUploadFileHandler
  );

  // Get agent status for policy
  router.get(
    {
      path: AGENT_API_ROUTES.STATUS_PATTERN,
      validate: GetAgentStatusRequestSchema,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        calculateRouteAuthz(
          fleetAuthz,
          getRouteRequiredAuthz('get', AGENT_API_ROUTES.STATUS_PATTERN)
        ).granted,
    },
    getAgentStatusForAgentPolicyHandler
  );
  router.get(
    {
      path: AGENT_API_ROUTES.STATUS_PATTERN_DEPRECATED,
      validate: GetAgentStatusRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getAgentStatusForAgentPolicyHandler
  );
  // Agent data
  router.get(
    {
      path: AGENT_API_ROUTES.DATA_PATTERN,
      validate: GetAgentDataRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getAgentDataHandler
  );

  // upgrade agent
  router.post(
    {
      path: AGENT_API_ROUTES.UPGRADE_PATTERN,
      validate: PostAgentUpgradeRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    postAgentUpgradeHandler
  );
  // bulk upgrade
  router.post(
    {
      path: AGENT_API_ROUTES.BULK_UPGRADE_PATTERN,
      validate: PostBulkAgentUpgradeRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    postBulkAgentsUpgradeHandler
  );

  // Current actions
  router.get(
    {
      path: AGENT_API_ROUTES.ACTION_STATUS_PATTERN,
      validate: GetActionStatusRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getActionStatusHandler
  );

  // Bulk reassign
  router.post(
    {
      path: AGENT_API_ROUTES.BULK_REASSIGN_PATTERN,
      validate: PostBulkAgentReassignRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    postBulkAgentsReassignHandler
  );

  // Bulk unenroll
  router.post(
    {
      path: AGENT_API_ROUTES.BULK_UNENROLL_PATTERN,
      validate: PostBulkAgentUnenrollRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    postBulkAgentsUnenrollHandler
  );

  // Available versions for upgrades
  router.get(
    {
      path: AGENT_API_ROUTES.AVAILABLE_VERSIONS_PATTERN,
      validate: false,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getAvailableVersionsHandler
  );
};
