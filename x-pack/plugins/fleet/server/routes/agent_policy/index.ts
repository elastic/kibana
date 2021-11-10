/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLUGIN_ID, AGENT_POLICY_API_ROUTES } from '../../constants';
import {
  GetAgentPoliciesRequestSchema,
  GetOneAgentPolicyRequestSchema,
  CreateAgentPolicyRequestSchema,
  UpdateAgentPolicyRequestSchema,
  CopyAgentPolicyRequestSchema,
  DeleteAgentPolicyRequestSchema,
  GetFullAgentPolicyRequestSchema,
} from '../../types';
import type { FleetRouter } from '../../types/request_context';

import {
  getAgentPoliciesHandler,
  getOneAgentPolicyHandler,
  createAgentPolicyHandler,
  updateAgentPolicyHandler,
  copyAgentPolicyHandler,
  deleteAgentPoliciesHandler,
  getFullAgentPolicy,
  downloadFullAgentPolicy,
} from './handlers';

export const registerRoutes = (routers: { superuser: FleetRouter; fleetSetup: FleetRouter }) => {
  // List - Fleet Server needs access to run setup
  routers.fleetSetup.get(
    {
      path: AGENT_POLICY_API_ROUTES.LIST_PATTERN,
      validate: GetAgentPoliciesRequestSchema,
      // Disable this tag and the automatic RBAC support until elastic/fleet-server access is removed in 8.0
      // Required to allow elastic/fleet-server to access this API.
      // options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getAgentPoliciesHandler
  );

  // Get one
  routers.superuser.get(
    {
      path: AGENT_POLICY_API_ROUTES.INFO_PATTERN,
      validate: GetOneAgentPolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getOneAgentPolicyHandler
  );

  // Create
  routers.superuser.post(
    {
      path: AGENT_POLICY_API_ROUTES.CREATE_PATTERN,
      validate: CreateAgentPolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    createAgentPolicyHandler
  );

  // Update
  routers.superuser.put(
    {
      path: AGENT_POLICY_API_ROUTES.UPDATE_PATTERN,
      validate: UpdateAgentPolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    updateAgentPolicyHandler
  );

  // Copy
  routers.superuser.post(
    {
      path: AGENT_POLICY_API_ROUTES.COPY_PATTERN,
      validate: CopyAgentPolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    copyAgentPolicyHandler
  );

  // Delete
  routers.superuser.post(
    {
      path: AGENT_POLICY_API_ROUTES.DELETE_PATTERN,
      validate: DeleteAgentPolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    deleteAgentPoliciesHandler
  );

  // Get one full agent policy
  routers.superuser.get(
    {
      path: AGENT_POLICY_API_ROUTES.FULL_INFO_PATTERN,
      validate: GetFullAgentPolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getFullAgentPolicy
  );

  // Download one full agent policy
  routers.superuser.get(
    {
      path: AGENT_POLICY_API_ROUTES.FULL_INFO_DOWNLOAD_PATTERN,
      validate: GetFullAgentPolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    downloadFullAgentPolicy
  );
};
