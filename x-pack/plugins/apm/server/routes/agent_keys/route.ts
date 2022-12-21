/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import * as t from 'io-ts';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getAgentKeys } from './get_agent_keys';
import { getAgentKeysPrivileges } from './get_agent_keys_privileges';
import { invalidateAgentKey } from './invalidate_agent_key';
import { createAgentKey } from './create_agent_key';
import { privilegesTypeRt } from '../../../common/privilege_type';

const agentKeysRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/agent_keys',
  options: { tags: ['access:apm'] },

  handler: async (
    resources
  ): Promise<{
    agentKeys: Array<import('./../../../../security/common/index').ApiKey>;
  }> => {
    const { context } = resources;
    const agentKeys = await getAgentKeys({
      context,
    });

    return agentKeys;
  },
});

const agentKeysPrivilegesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/agent_keys/privileges',
  options: { tags: ['access:apm'] },

  handler: async (
    resources
  ): Promise<{
    areApiKeysEnabled: boolean;
    isAdmin: boolean;
    canManage: boolean;
  }> => {
    const {
      plugins: { security },
      context,
    } = resources;

    if (!security) {
      throw Boom.internal(SECURITY_REQUIRED_MESSAGE);
    }

    const securityPluginStart = await security.start();
    const agentKeysPrivileges = await getAgentKeysPrivileges({
      context,
      securityPluginStart,
    });

    return agentKeysPrivileges;
  },
});

const invalidateAgentKeyRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/api_key/invalidate',
  options: { tags: ['access:apm', 'access:apm_write'] },
  params: t.type({
    body: t.type({ id: t.string }),
  }),
  handler: async (resources): Promise<{ invalidatedAgentKeys: string[] }> => {
    const {
      context,
      params,
      plugins: { security },
    } = resources;
    const {
      body: { id },
    } = params;

    if (!security) {
      throw Boom.internal(SECURITY_REQUIRED_MESSAGE);
    }

    const securityPluginStart = await security.start();
    const { isAdmin } = await getAgentKeysPrivileges({
      context,
      securityPluginStart,
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
  endpoint: 'POST /api/apm/agent_keys',
  options: { tags: ['access:apm', 'access:apm_write'] },
  params: t.type({
    body: t.type({
      name: t.string,
      privileges: privilegesTypeRt,
    }),
  }),
  handler: async (
    resources
  ): Promise<{
    agentKey: import('./../../../../../../node_modules/@elastic/elasticsearch/lib/api/types').SecurityCreateApiKeyResponse;
  }> => {
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

const SECURITY_REQUIRED_MESSAGE = i18n.translate(
  'xpack.apm.api.apiKeys.securityRequired',
  { defaultMessage: 'Security plugin is required' }
);
