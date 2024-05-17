/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthz } from '../../../common';
import { API_VERSIONS } from '../../../common/constants';

import { type FleetAuthzRouter, getRouteRequiredAuthz } from '../../services/security';

import type { FleetConfigType } from '../..';
import { AGENT_API_ROUTES } from '../../constants';
import * as AgentService from '../../services/agents';
import {
  DeleteAgentRequestSchema,
  GetActionStatusRequestSchema,
  GetAgentDataRequestSchema,
  GetAgentStatusRequestSchema,
  GetAgentUploadFileRequestSchema,
  GetAgentsRequestSchema,
  GetOneAgentRequestSchema,
  GetTagsRequestSchema,
  ListAgentUploadsRequestSchema,
  PostAgentReassignRequestSchema,
  PostAgentUnenrollRequestSchema,
  PostAgentUpgradeRequestSchema,
  PostBulkAgentReassignRequestSchema,
  PostBulkAgentUnenrollRequestSchema,
  PostBulkAgentUpgradeRequestSchema,
  PostBulkRequestDiagnosticsActionRequestSchema,
  PostCancelActionRequestSchema,
  PostNewAgentActionRequestSchema,
  PostRequestDiagnosticsActionRequestSchema,
  PostRetrieveAgentsByActionsRequestSchema,
  PutAgentReassignRequestSchemaDeprecated,
  UpdateAgentRequestSchema,
} from '../../types';

import { PostBulkUpdateAgentTagsRequestSchema } from '../../types/rest_spec/agent';

import { calculateRouteAuthz } from '../../services/security/security';

import {
  postCancelActionHandlerBuilder,
  postNewAgentActionHandlerBuilder,
} from './actions_handlers';
import {
  bulkUpdateAgentTagsHandler,
  deleteAgentHandler,
  getActionStatusHandler,
  getAgentDataHandler,
  getAgentHandler,
  getAgentStatusForAgentPolicyHandler,
  getAgentTagsHandler,
  getAgentUploadFileHandler,
  getAgentUploadsHandler,
  getAgentsHandler,
  getAvailableVersionsHandler,
  postAgentsReassignHandler,
  postBulkAgentReassignHandler,
  postRetrieveAgentsByActionsHandler,
  putAgentsReassignHandlerDeprecated,
  updateAgentHandler,
} from './handlers';
import {
  bulkRequestDiagnosticsHandler,
  requestDiagnosticsHandler,
} from './request_diagnostics_handler';
import { postAgentUnenrollHandler, postBulkAgentsUnenrollHandler } from './unenroll_handler';
import { postAgentUpgradeHandler, postBulkAgentsUpgradeHandler } from './upgrade_handler';

export const registerAPIRoutes = (router: FleetAuthzRouter, config: FleetConfigType) => {
  // Get one
  router.versioned
    .get({
      path: AGENT_API_ROUTES.INFO_PATTERN,
      fleetAuthz: {
        fleet: { readAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetOneAgentRequestSchema },
      },
      getAgentHandler
    );

  // Update
  router.versioned
    .put({
      path: AGENT_API_ROUTES.UPDATE_PATTERN,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: UpdateAgentRequestSchema },
      },
      updateAgentHandler
    );

  // Bulk Update Tags
  router.versioned
    .post({
      path: AGENT_API_ROUTES.BULK_UPDATE_AGENT_TAGS_PATTERN,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostBulkUpdateAgentTagsRequestSchema },
      },
      bulkUpdateAgentTagsHandler
    );

  // Delete
  router.versioned
    .delete({
      path: AGENT_API_ROUTES.DELETE_PATTERN,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: DeleteAgentRequestSchema },
      },
      deleteAgentHandler
    );

  // List
  router.versioned
    .get({
      path: AGENT_API_ROUTES.LIST_PATTERN,

      fleetAuthz: {
        fleet: { readAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetAgentsRequestSchema },
      },
      getAgentsHandler
    );

  // List Agent Tags
  router.versioned
    .get({
      path: AGENT_API_ROUTES.LIST_TAGS_PATTERN,
      fleetAuthz: {
        fleet: { readAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetTagsRequestSchema },
      },
      getAgentTagsHandler
    );

  // Agent actions
  router.versioned
    .post({
      path: AGENT_API_ROUTES.ACTIONS_PATTERN,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostNewAgentActionRequestSchema },
      },
      postNewAgentActionHandlerBuilder({
        getAgent: AgentService.getAgentById,
        cancelAgentAction: AgentService.cancelAgentAction,
        createAgentAction: AgentService.createAgentAction,
        getAgentActions: AgentService.getAgentActions,
      })
    );

  router.versioned
    .post({
      path: AGENT_API_ROUTES.CANCEL_ACTIONS_PATTERN,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostCancelActionRequestSchema },
      },
      postCancelActionHandlerBuilder({
        getAgent: AgentService.getAgentById,
        cancelAgentAction: AgentService.cancelAgentAction,
        createAgentAction: AgentService.createAgentAction,
        getAgentActions: AgentService.getAgentActions,
      })
    );

  // Get agents by Action_Ids
  router.versioned
    .post({
      path: AGENT_API_ROUTES.LIST_PATTERN,
      fleetAuthz: {
        fleet: { readAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostRetrieveAgentsByActionsRequestSchema },
      },
      postRetrieveAgentsByActionsHandler
    );

  router.versioned
    .post({
      path: AGENT_API_ROUTES.UNENROLL_PATTERN,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostAgentUnenrollRequestSchema },
      },
      postAgentUnenrollHandler
    );

  // mark as deprecated
  router.versioned
    .put({
      path: AGENT_API_ROUTES.REASSIGN_PATTERN,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PutAgentReassignRequestSchemaDeprecated },
      },
      putAgentsReassignHandlerDeprecated
    );

  router.versioned
    .post({
      path: AGENT_API_ROUTES.REASSIGN_PATTERN,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostAgentReassignRequestSchema },
      },
      postAgentsReassignHandler
    );

  router.versioned
    .post({
      path: AGENT_API_ROUTES.REQUEST_DIAGNOSTICS_PATTERN,
      fleetAuthz: {
        fleet: { readAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostRequestDiagnosticsActionRequestSchema },
      },
      requestDiagnosticsHandler
    );

  router.versioned
    .post({
      path: AGENT_API_ROUTES.BULK_REQUEST_DIAGNOSTICS_PATTERN,
      fleetAuthz: {
        fleet: { readAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostBulkRequestDiagnosticsActionRequestSchema },
      },
      bulkRequestDiagnosticsHandler
    );

  router.versioned
    .get({
      path: AGENT_API_ROUTES.LIST_UPLOADS_PATTERN,
      fleetAuthz: {
        fleet: { readAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: ListAgentUploadsRequestSchema },
      },
      getAgentUploadsHandler
    );

  router.versioned
    .get({
      path: AGENT_API_ROUTES.GET_UPLOAD_FILE_PATTERN,
      fleetAuthz: {
        fleet: { readAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetAgentUploadFileRequestSchema },
      },
      getAgentUploadFileHandler
    );

  // Get agent status for policy
  router.versioned
    .get({
      path: AGENT_API_ROUTES.STATUS_PATTERN,
      fleetAuthz: (fleetAuthz: FleetAuthz): boolean =>
        calculateRouteAuthz(
          fleetAuthz,
          getRouteRequiredAuthz('get', AGENT_API_ROUTES.STATUS_PATTERN)
        ).granted,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetAgentStatusRequestSchema },
      },
      getAgentStatusForAgentPolicyHandler
    );
  router.versioned
    .get({
      path: AGENT_API_ROUTES.STATUS_PATTERN_DEPRECATED,
      fleetAuthz: {
        fleet: { readAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetAgentStatusRequestSchema },
      },
      getAgentStatusForAgentPolicyHandler
    );
  // Agent data
  router.versioned
    .get({
      path: AGENT_API_ROUTES.DATA_PATTERN,
      fleetAuthz: {
        fleet: { readAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetAgentDataRequestSchema },
      },
      getAgentDataHandler
    );

  // upgrade agent
  router.versioned
    .post({
      path: AGENT_API_ROUTES.UPGRADE_PATTERN,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostAgentUpgradeRequestSchema },
      },
      postAgentUpgradeHandler
    );
  // bulk upgrade
  router.versioned
    .post({
      path: AGENT_API_ROUTES.BULK_UPGRADE_PATTERN,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostBulkAgentUpgradeRequestSchema },
      },
      postBulkAgentsUpgradeHandler
    );

  // Current actions
  router.versioned
    .get({
      path: AGENT_API_ROUTES.ACTION_STATUS_PATTERN,
      fleetAuthz: {
        fleet: { readAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetActionStatusRequestSchema },
      },
      getActionStatusHandler
    );

  // Bulk reassign
  router.versioned
    .post({
      path: AGENT_API_ROUTES.BULK_REASSIGN_PATTERN,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostBulkAgentReassignRequestSchema },
      },
      postBulkAgentReassignHandler
    );

  // Bulk unenroll
  router.versioned
    .post({
      path: AGENT_API_ROUTES.BULK_UNENROLL_PATTERN,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostBulkAgentUnenrollRequestSchema },
      },
      postBulkAgentsUnenrollHandler
    );

  // Available versions for upgrades
  router.versioned
    .get({
      path: AGENT_API_ROUTES.AVAILABLE_VERSIONS_PATTERN,
      fleetAuthz: {
        fleet: { readAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: false,
      },
      getAvailableVersionsHandler
    );
};
