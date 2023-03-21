/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

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
} from '../../types';

import { K8S_API_ROUTES } from '../../../common/constants';

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
} from './handlers';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // List - Fleet Server needs access to run setup
  router.get(
    {
      path: AGENT_POLICY_API_ROUTES.LIST_PATTERN,
      validate: GetAgentPoliciesRequestSchema,
      fleetAuthz: {
        fleet: { readAgentPolicies: true },
      },
    },
    getAgentPoliciesHandler
  );

  // Bulk GET
  router.post(
    {
      path: AGENT_POLICY_API_ROUTES.BULK_GET_PATTERN,
      validate: BulkGetAgentPoliciesRequestSchema,
      fleetAuthz: {
        fleet: { readAgentPolicies: true },
      },
    },
    bulkGetAgentPoliciesHandler
  );

  // Get one
  router.get(
    {
      path: AGENT_POLICY_API_ROUTES.INFO_PATTERN,
      validate: GetOneAgentPolicyRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getOneAgentPolicyHandler
  );

  // Create
  router.post(
    {
      path: AGENT_POLICY_API_ROUTES.CREATE_PATTERN,
      validate: CreateAgentPolicyRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    createAgentPolicyHandler
  );

  // Update
  router.put(
    {
      path: AGENT_POLICY_API_ROUTES.UPDATE_PATTERN,
      validate: UpdateAgentPolicyRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    updateAgentPolicyHandler
  );

  // Copy
  router.post(
    {
      path: AGENT_POLICY_API_ROUTES.COPY_PATTERN,
      validate: CopyAgentPolicyRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    copyAgentPolicyHandler
  );

  // Delete
  router.post(
    {
      path: AGENT_POLICY_API_ROUTES.DELETE_PATTERN,
      validate: DeleteAgentPolicyRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    deleteAgentPoliciesHandler
  );

  // Get one full agent policy
  router.get(
    {
      path: AGENT_POLICY_API_ROUTES.FULL_INFO_PATTERN,
      validate: GetFullAgentPolicyRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getFullAgentPolicy
  );

  // Download one full agent policy
  router.get(
    {
      path: AGENT_POLICY_API_ROUTES.FULL_INFO_DOWNLOAD_PATTERN,
      validate: GetFullAgentPolicyRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    downloadFullAgentPolicy
  );

  // Get agent manifest
  router.get(
    {
      path: K8S_API_ROUTES.K8S_INFO_PATTERN,
      validate: GetK8sManifestRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getK8sManifest
  );

  // Download agent manifest
  router.get(
    {
      path: K8S_API_ROUTES.K8S_DOWNLOAD_PATTERN,
      validate: GetK8sManifestRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    downloadK8sManifest
  );
};
