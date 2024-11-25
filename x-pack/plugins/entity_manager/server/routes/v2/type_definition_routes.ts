/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  CREATE_ENTITY_TYPE_DEFINITION_PRIVILEGE,
  READ_ENTITY_TYPE_DEFINITION_PRIVILEGE,
} from '../../lib/v2/constants';
import { entityTypeDefinitionRt } from '../../lib/v2/types';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';

const createTypeDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/v2/definitions/types',
  security: {
    authz: {
      requiredPrivileges: [CREATE_ENTITY_TYPE_DEFINITION_PRIVILEGE],
    },
  },
  params: z.object({
    body: z.object({
      type: entityTypeDefinitionRt,
    }),
  }),
  handler: async ({ request, response, params, getScopedClient }) => {
    const client = await getScopedClient({ request });
    const result = await client.v2.storeTypeDefinition(params.body.type);

    if (result.status === 'success') {
      return response.created({
        body: {
          type: result.resource,
        },
        headers: {
          location: `GET /internal/entities/v2/definitions/types/${result.resource.id}`,
        },
      });
    } else if (result.status === 'conflict') {
      return response.conflict({
        body: {
          message: result.reason,
        },
      });
    } else if (result.status === 'error') {
      return response.customError({
        statusCode: 500,
        body: {
          message: result.reason,
        },
      });
    }
  },
});

const readTypeDefinitionsRoute = createEntityManagerServerRoute({
  endpoint: 'GET /internal/entities/v2/definitions/types',
  security: {
    authz: {
      requiredPrivileges: [READ_ENTITY_TYPE_DEFINITION_PRIVILEGE],
    },
  },
  handler: async ({ request, response, getScopedClient }) => {
    const client = await getScopedClient({ request });
    const result = await client.v2.readTypeDefinitions();

    if (result.status === 'success') {
      return response.ok({
        body: {
          types: result.resource,
        },
      });
    } else if (result.status === 'error') {
      return response.customError({
        statusCode: 500,
        body: {
          message: result.reason,
        },
      });
    }
  },
});

export const typeDefinitionRoutes = {
  ...createTypeDefinitionRoute,
  ...readTypeDefinitionsRoute,
};
