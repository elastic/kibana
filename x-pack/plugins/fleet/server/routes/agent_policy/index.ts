/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'src/core/server';
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

export const registerRoutes = (router: IRouter) => {
  // List
  router.get(
    {
      path: AGENT_POLICY_API_ROUTES.LIST_PATTERN,
      validate: GetAgentPoliciesRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getAgentPoliciesHandler
  );

  // Get one
  router.get(
    {
      path: AGENT_POLICY_API_ROUTES.INFO_PATTERN,
      validate: GetOneAgentPolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getOneAgentPolicyHandler
  );

  // Create
  router.post(
    {
      path: AGENT_POLICY_API_ROUTES.CREATE_PATTERN,
      validate: CreateAgentPolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    createAgentPolicyHandler
  );

  // Update
  router.put(
    {
      path: AGENT_POLICY_API_ROUTES.UPDATE_PATTERN,
      validate: UpdateAgentPolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    updateAgentPolicyHandler
  );

  // Copy
  router.post(
    {
      path: AGENT_POLICY_API_ROUTES.COPY_PATTERN,
      validate: CopyAgentPolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    copyAgentPolicyHandler
  );

  // Delete
  router.post(
    {
      path: AGENT_POLICY_API_ROUTES.DELETE_PATTERN,
      validate: DeleteAgentPolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    deleteAgentPoliciesHandler
  );

  // Get one full agent policy
  router.get(
    {
      path: AGENT_POLICY_API_ROUTES.FULL_INFO_PATTERN,
      validate: GetFullAgentPolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getFullAgentPolicy
  );

  // Download one full agent policy
  router.get(
    {
      path: AGENT_POLICY_API_ROUTES.FULL_INFO_DOWNLOAD_PATTERN,
      validate: GetFullAgentPolicyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    downloadFullAgentPolicy
  );
};
