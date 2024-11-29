/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS } from '../../../common/constants';

import { AGENT_POLICY_API_ROUTES } from '../../constants';
import {
  GetAgentPoliciesRequestSchema,
  GetOneAgentPolicyRequestSchema,
  CreateAgentPolicyRequestSchema,
  UpdateAgentPolicyRequestSchema,
  CopyAgentPolicyRequestSchema,
  DeleteAgentPolicyRequestSchema,
  GetFullAgentPolicyRequestSchema,
  GetK8sManifestRequestSchema,
  BulkGetAgentPoliciesRequestSchema,
  AgentPolicyResponseSchema,
  BulkGetAgentPoliciesResponseSchema,
  GetAgentPolicyResponseSchema,
  DeleteAgentPolicyResponseSchema,
  GetFullAgentPolicyResponseSchema,
  DownloadFullAgentPolicyResponseSchema,
  GetK8sManifestResponseScheme,
  GetAgentPolicyOutputsRequestSchema,
  GetAgentPolicyOutputsResponseSchema,
  GetListAgentPolicyOutputsResponseSchema,
  GetListAgentPolicyOutputsRequestSchema,
} from '../../types';

import { K8S_API_ROUTES } from '../../../common/constants';

import { genericErrorResponse } from '../schema/errors';
import { ListResponseSchema } from '../schema/utils';

import {
  getAgentPoliciesHandler,
  getOneAgentPolicyHandler,
  createAgentPolicyHandler,
  updateAgentPolicyHandler,
  copyAgentPolicyHandler,
  deleteAgentPoliciesHandler,
  getFullAgentPolicy,
  downloadFullAgentPolicy,
  downloadK8sManifest,
  getK8sManifest,
  bulkGetAgentPoliciesHandler,
  GetAgentPolicyOutputsHandler,
  GetListAgentPolicyOutputsHandler,
} from './handlers';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // List - Fleet Server needs access to run setup
  router.versioned
    .get({
      path: AGENT_POLICY_API_ROUTES.LIST_PATTERN,
      fleetAuthz: (authz) => {
        //  Allow to retrieve agent policies metadata (no full) for user with only read agents permissions
        return authz.fleet.readAgentPolicies || authz.fleet.readAgents;
      },
      summary: `Get agent policies`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetAgentPoliciesRequestSchema,
          response: {
            200: {
              body: () => ListResponseSchema(AgentPolicyResponseSchema),
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getAgentPoliciesHandler
    );

  // Bulk GET
  router.versioned
    .post({
      path: AGENT_POLICY_API_ROUTES.BULK_GET_PATTERN,
      fleetAuthz: (authz) => {
        //  Allow to retrieve agent policies metadata (no full) for user with only read agents permissions
        return authz.fleet.readAgentPolicies || authz.fleet.readAgents;
      },
      summary: `Bulk get agent policies`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: BulkGetAgentPoliciesRequestSchema,
          response: {
            200: {
              body: () => BulkGetAgentPoliciesResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      bulkGetAgentPoliciesHandler
    );

  // Get one
  router.versioned
    .get({
      path: AGENT_POLICY_API_ROUTES.INFO_PATTERN,
      fleetAuthz: (authz) => {
        //  Allow to retrieve agent policies metadata (no full) for user with only read agents permissions
        return authz.fleet.readAgentPolicies || authz.fleet.readAgents;
      },
      summary: `Get an agent policy`,
      description: `Get an agent policy by ID.`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetOneAgentPolicyRequestSchema,
          response: {
            200: {
              body: () => GetAgentPolicyResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getOneAgentPolicyHandler
    );

  // Create
  router.versioned
    .post({
      path: AGENT_POLICY_API_ROUTES.CREATE_PATTERN,
      fleetAuthz: {
        fleet: { allAgentPolicies: true },
      },
      summary: `Create an agent policy`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: CreateAgentPolicyRequestSchema,
          response: {
            200: {
              body: () => GetAgentPolicyResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      createAgentPolicyHandler
    );

  // Update
  router.versioned
    .put({
      path: AGENT_POLICY_API_ROUTES.UPDATE_PATTERN,
      fleetAuthz: {
        fleet: { allAgentPolicies: true },
      },
      summary: `Update an agent policy`,
      description: `Update an agent policy by ID.`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: UpdateAgentPolicyRequestSchema,
          response: {
            200: {
              body: () => GetAgentPolicyResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      updateAgentPolicyHandler
    );

  // Copy
  router.versioned
    .post({
      path: AGENT_POLICY_API_ROUTES.COPY_PATTERN,
      fleetAuthz: {
        fleet: { allAgentPolicies: true },
      },
      summary: `Copy an agent policy`,
      description: `Copy an agent policy by ID.`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: CopyAgentPolicyRequestSchema,
          response: {
            200: {
              body: () => GetAgentPolicyResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      copyAgentPolicyHandler
    );

  // Delete
  router.versioned
    .post({
      path: AGENT_POLICY_API_ROUTES.DELETE_PATTERN,
      fleetAuthz: {
        fleet: { allAgentPolicies: true },
      },
      summary: `Delete an agent policy`,
      description: `Delete an agent policy by ID.`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DeleteAgentPolicyRequestSchema,
          response: {
            200: {
              body: () => DeleteAgentPolicyResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      deleteAgentPoliciesHandler
    );

  // Get one full agent policy
  router.versioned
    .get({
      path: AGENT_POLICY_API_ROUTES.FULL_INFO_PATTERN,
      fleetAuthz: {
        fleet: { readAgentPolicies: true },
      },
      summary: `Get a full agent policy`,
      description: `Get a full agent policy by ID.`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetFullAgentPolicyRequestSchema,
          response: {
            200: {
              body: () => GetFullAgentPolicyResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getFullAgentPolicy
    );

  // Download one full agent policy
  router.versioned
    .get({
      path: AGENT_POLICY_API_ROUTES.FULL_INFO_DOWNLOAD_PATTERN,
      fleetAuthz: {
        fleet: { readAgentPolicies: true },
      },
      enableQueryVersion: true,
      summary: `Download an agent policy`,
      description: `Download an agent policy by ID.`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetFullAgentPolicyRequestSchema,
          response: {
            200: {
              body: () => DownloadFullAgentPolicyResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
            404: {
              body: genericErrorResponse,
            },
          },
        },
      },
      downloadFullAgentPolicy
    );

  // Get agent manifest
  router.versioned
    .get({
      path: K8S_API_ROUTES.K8S_INFO_PATTERN,
      fleetAuthz: {
        fleet: { readAgentPolicies: true },
      },
      summary: `Get a full K8s agent manifest`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetK8sManifestRequestSchema,
          response: {
            200: {
              body: () => GetK8sManifestResponseScheme,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getK8sManifest
    );

  // Download agent manifest
  router.versioned
    .get({
      path: K8S_API_ROUTES.K8S_DOWNLOAD_PATTERN,
      fleetAuthz: {
        fleet: { readAgentPolicies: true },
      },
      enableQueryVersion: true,
      summary: `Download an agent manifest`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetK8sManifestRequestSchema,
          response: {
            200: {
              body: () => schema.string(),
            },
            400: {
              body: genericErrorResponse,
            },
            404: {
              body: genericErrorResponse,
            },
          },
        },
      },
      downloadK8sManifest
    );

  router.versioned
    .post({
      path: AGENT_POLICY_API_ROUTES.LIST_OUTPUTS_PATTERN,
      fleetAuthz: (authz) => {
        return authz.fleet.readAgentPolicies && authz.fleet.readSettings;
      },
      summary: `Get outputs for agent policies`,
      description: `Get a list of outputs associated with agent policies.`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetListAgentPolicyOutputsRequestSchema,
          response: {
            200: {
              body: () => GetListAgentPolicyOutputsResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      GetListAgentPolicyOutputsHandler
    );

  router.versioned
    .get({
      path: AGENT_POLICY_API_ROUTES.INFO_OUTPUTS_PATTERN,
      fleetAuthz: (authz) => {
        return authz.fleet.readAgentPolicies && authz.fleet.readSettings;
      },
      summary: `Get outputs for an agent policy`,
      description: `Get a list of outputs associated with agent policy by policy id.`,
      options: {
        tags: ['oas-tag:Elastic Agent policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetAgentPolicyOutputsRequestSchema,
          response: {
            200: {
              body: () => GetAgentPolicyOutputsResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      GetAgentPolicyOutputsHandler
    );
};
