/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { z } from '@kbn/zod';
import {
  CREATE_ENTITY_TYPE_DEFINITION_PRIVILEGE,
  READ_ENTITY_TYPE_DEFINITION_PRIVILEGE,
} from '../../lib/v2/constants';
import { readTypeDefinitions, storeTypeDefinition } from '../../lib/v2/type_definition';
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
  handler: async ({ context, response, params, logger }) => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asInternalUser,
      logger,
      plugin: '@kbn/entityManager-plugin',
    });

    const result = await storeTypeDefinition(params.body.type, esClient);

    if (result.status === 'success') {
      return response.created({
        body: {
          type: result.resource,
        },
        headers: {
          location: `GET /internal/entities/v2/definitions/types/${result.resource!.id}`,
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
  handler: async ({ context, response, logger }) => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asInternalUser,
      logger,
      plugin: '@kbn/entityManager-plugin',
    });

    const result = await readTypeDefinitions(esClient);

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
