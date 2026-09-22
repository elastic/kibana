/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  routeDefinitions,
  type AgentKeysResponse,
  type AgentKeysPrivilegesResponse,
  type InvalidateAgentKeyResponse,
  type CreateAgentKeyResponse,
} from '@kbn/apm-api-shared';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getAgentKeys } from './get_agent_keys';
import { getAgentKeysPrivileges } from './get_agent_keys_privileges';
import { invalidateAgentKey } from './invalidate_agent_key';
import { createAgentKey } from './create_agent_key';

const agentKeysRoute = createApmServerRoute({
  endpoint: routeDefinitions.agentKeys.agentKeys.endpoint,
  security: { authz: { requiredPrivileges: ['apm'] } },

  handler: async (resources): Promise<AgentKeysResponse> => {
    const { context } = resources;
    const agentKeys = await getAgentKeys({
      context,
    });

    return agentKeys;
  },
});

const agentKeysPrivilegesRoute = createApmServerRoute({
  endpoint: routeDefinitions.agentKeys.agentKeysPrivileges.endpoint,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<AgentKeysPrivilegesResponse> => {
    const { context, core } = resources;

    const coreStart = await core.start();
    const agentKeysPrivileges = await getAgentKeysPrivileges({
      context,
      coreStart,
    });

    return agentKeysPrivileges;
  },
});

const invalidateAgentKeyRoute = createApmServerRoute({
  endpoint: routeDefinitions.agentKeys.invalidateAgentKey.endpoint,
  params: routeDefinitions.agentKeys.invalidateAgentKey.params,
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_settings_write'],
    },
  },
  handler: async (resources): Promise<InvalidateAgentKeyResponse> => {
    const { context, params, core } = resources;
    const {
      body: { id },
    } = params;

    const coreStart = await core.start();
    const { isAdmin } = await getAgentKeysPrivileges({
      context,
      coreStart,
    });

    const invalidatedKeys = await invalidateAgentKey({
      context,
      id,
      isAdmin,
    });

    return invalidatedKeys;
  },
});

const createAgentKeyRoute = createApmServerRoute({
  endpoint: routeDefinitions.agentKeys.createAgentKey.endpoint,
  params: routeDefinitions.agentKeys.createAgentKey.params,
  options: { tags: ['oas-tag:APM agent keys'] },
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_settings_write'],
    },
  },
  handler: async (resources): Promise<CreateAgentKeyResponse> => {
    const { context, params } = resources;

    const { body: requestBody } = params;

    const agentKey = await createAgentKey({
      context,
      requestBody,
    });

    return agentKey;
  },
});

export const agentKeysRouteRepository = {
  ...agentKeysRoute,
  ...agentKeysPrivilegesRoute,
  ...invalidateAgentKeyRoute,
  ...createAgentKeyRoute,
};
