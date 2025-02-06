/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import type { AgentKeysResponse } from './get_agent_keys';
import { getAgentKeys } from './get_agent_keys';
import type { AgentKeysPrivilegesResponse } from './get_agent_keys_privileges';
import { getAgentKeysPrivileges } from './get_agent_keys_privileges';
import type { InvalidateAgentKeyResponse } from './invalidate_agent_key';
import { invalidateAgentKey } from './invalidate_agent_key';
import type { CreateAgentKeyResponse } from './create_agent_key';
import { createAgentKey } from './create_agent_key';
import { privilegesTypeRt } from '../../../common/privilege_type';

const agentKeysRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/agent_keys',
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
  endpoint: 'GET /internal/apm/agent_keys/privileges',
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
  endpoint: 'POST /internal/apm/api_key/invalidate',
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_settings_write'],
    },
  },
  params: t.type({
    body: t.type({ id: t.string }),
  }),
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
  endpoint: 'POST /api/apm/agent_keys 2023-10-31',
  options: { tags: ['oas-tag:APM agent keys'] },
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_settings_write'],
    },
  },
  params: t.type({
    body: t.type({
      name: t.string,
      privileges: privilegesTypeRt,
    }),
  }),
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
