/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import type { FleetAuthz } from '../../../common';
import { API_VERSIONS } from '../../../common/constants';

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
  PutAgentReassignRequestSchemaDeprecated,
  PostAgentReassignRequestSchema,
  PostBulkAgentReassignRequestSchema,
  PostAgentUpgradeRequestSchema,
  PostBulkAgentUpgradeRequestSchema,
  GetActionStatusRequestSchema,
  PostRequestDiagnosticsActionRequestSchema,
  PostBulkRequestDiagnosticsActionRequestSchema,
  ListAgentUploadsRequestSchema,
  GetAgentUploadFileRequestSchema,
  PostRetrieveAgentsByActionsRequestSchema,
  DeleteAgentUploadFileRequestSchema,
  GetTagsResponseSchema,
} from '../../types';
import * as AgentService from '../../services/agents';
import type { FleetConfigType } from '../..';

import {
  DeleteAgentResponseSchema,
  DeleteAgentUploadFileResponseSchema,
  GetActionStatusResponseSchema,
  GetAgentDataResponseSchema,
  GetAgentResponseSchema,
  GetAgentStatusResponseSchema,
  GetAgentsResponseSchema,
  GetAvailableAgentVersionsResponseSchema,
  ListAgentUploadsResponseSchema,
  PostBulkActionResponseSchema,
  PostBulkUpdateAgentTagsRequestSchema,
  PostCancelActionRequestSchema,
  PostNewAgentActionResponseSchema,
  PostRetrieveAgentsByActionsResponseSchema,
} from '../../types/rest_spec/agent';

import { calculateRouteAuthz } from '../../services/security/security';

import { genericErrorResponse } from '../schema/errors';

import {
  getAgentsHandler,
  getAgentTagsHandler,
  getAgentHandler,
  updateAgentHandler,
  deleteAgentHandler,
  getAgentStatusForAgentPolicyHandler,
  putAgentsReassignHandlerDeprecated,
  postBulkAgentReassignHandler,
  getAgentDataHandler,
  bulkUpdateAgentTagsHandler,
  getAvailableVersionsHandler,
  getActionStatusHandler,
  getAgentUploadsHandler,
  getAgentUploadFileHandler,
  deleteAgentUploadFileHandler,
  postAgentReassignHandler,
  postRetrieveAgentsByActionsHandler,
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
  router.versioned
    .get({
      path: AGENT_API_ROUTES.INFO_PATTERN,
      fleetAuthz: {
        fleet: { readAgents: true },
      },
      description: `Get agent by ID`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetOneAgentRequestSchema,
          response: {
            200: {
              body: () => GetAgentResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: `Update agent by ID`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: UpdateAgentRequestSchema,
          response: {
            200: {
              body: () => GetAgentResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: `Bulk update agent tags`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostBulkUpdateAgentTagsRequestSchema,
          response: {
            200: {
              body: () => PostBulkActionResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: `Delete agent by ID`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DeleteAgentRequestSchema,
          response: {
            200: {
              body: () => DeleteAgentResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: `List agents`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetAgentsRequestSchema,
          response: {
            200: {
              body: () => GetAgentsResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: `List agent tags`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetTagsRequestSchema,
          response: {
            200: {
              body: () => GetTagsResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: `Create agent action`,
      options: {
        tags: ['oas_tag:Elastic Agent actions'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostNewAgentActionRequestSchema,
          response: {
            200: {
              body: () => PostNewAgentActionResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: `Cancel agent action`,
      options: {
        tags: ['oas_tag:Elastic Agent actions'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostCancelActionRequestSchema,
          response: {
            200: {
              body: () => PostNewAgentActionResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: `List agents by action ids`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostRetrieveAgentsByActionsRequestSchema,
          response: {
            200: {
              body: () => PostRetrieveAgentsByActionsResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      postRetrieveAgentsByActionsHandler
    );

  router.versioned
    .post({
      path: AGENT_API_ROUTES.UNENROLL_PATTERN,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
      description: `Unenroll agent`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostAgentUnenrollRequestSchema, response: {} },
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
      description: `Reassign agent`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostAgentReassignRequestSchema, response: {} },
      },
      postAgentReassignHandler
    );

  router.versioned
    .post({
      path: AGENT_API_ROUTES.REQUEST_DIAGNOSTICS_PATTERN,
      fleetAuthz: {
        fleet: { readAgents: true },
      },
      description: `Request agent diagnostics`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostRequestDiagnosticsActionRequestSchema,
          response: {
            200: {
              body: () => PostBulkActionResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      requestDiagnosticsHandler
    );

  router.versioned
    .post({
      path: AGENT_API_ROUTES.BULK_REQUEST_DIAGNOSTICS_PATTERN,
      fleetAuthz: {
        fleet: { readAgents: true },
      },
      description: `Bulk request diagnostics from agents`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostBulkRequestDiagnosticsActionRequestSchema,
          response: {
            200: {
              body: () => PostBulkActionResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      bulkRequestDiagnosticsHandler
    );

  router.versioned
    .get({
      path: AGENT_API_ROUTES.LIST_UPLOADS_PATTERN,
      fleetAuthz: {
        fleet: { readAgents: true },
      },
      description: `List agent uploads`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: ListAgentUploadsRequestSchema,
          response: {
            200: {
              body: () => ListAgentUploadsResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getAgentUploadsHandler
    );

  router.versioned
    .get({
      path: AGENT_API_ROUTES.GET_UPLOAD_FILE_PATTERN,
      fleetAuthz: {
        fleet: { readAgents: true },
      },
      description: `Get file uploaded by agent`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetAgentUploadFileRequestSchema,
          response: {
            200: {
              body: () => schema.stream(), // Readable
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getAgentUploadFileHandler
    );

  router.versioned
    .delete({
      path: AGENT_API_ROUTES.DELETE_UPLOAD_FILE_PATTERN,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
      description: `Delete file uploaded by agent`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DeleteAgentUploadFileRequestSchema,
          response: {
            200: {
              body: () => DeleteAgentUploadFileResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      deleteAgentUploadFileHandler
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
      description: `Get agent status summary`,
      options: {
        tags: ['oas_tag:Elastic Agent status'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetAgentStatusRequestSchema,
          response: {
            200: {
              body: () => GetAgentStatusResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: `Get incoming agent data`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetAgentDataRequestSchema,
          response: {
            200: {
              body: () => GetAgentDataResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: `Upgrade agent`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostAgentUpgradeRequestSchema, response: {} },
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
      description: `Bulk upgrade agents`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostBulkAgentUpgradeRequestSchema,
          response: {
            200: {
              body: () => PostBulkActionResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: `Get agent action status`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetActionStatusRequestSchema,
          response: {
            200: {
              body: () => GetActionStatusResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: `Bulk reassign agents`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostBulkAgentReassignRequestSchema,
          response: {
            200: {
              body: () => PostBulkActionResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: `Bulk unenroll agents`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostBulkAgentUnenrollRequestSchema,
          response: {
            200: {
              body: () => PostBulkActionResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
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
      description: `Get available agent versions`,
      options: {
        tags: ['oas_tag:Elastic Agents'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {},
          response: {
            200: {
              body: () => GetAvailableAgentVersionsResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getAvailableVersionsHandler
    );
};
