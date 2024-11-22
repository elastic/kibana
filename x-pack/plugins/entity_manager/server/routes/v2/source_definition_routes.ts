/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { z } from '@kbn/zod';
import {
  CREATE_ENTITY_SOURCE_DEFINITION_PRIVILEGE,
  READ_ENTITY_SOURCE_DEFINITION_PRIVILEGE,
} from '../../lib/v2/constants';
import { readSourceDefinitions, storeSourceDefinition } from '../../lib/v2/source_definition';
import { entitySourceDefinitionRt } from '../../lib/v2/types';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';

const createSourceDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/v2/definitions/sources',
  security: {
    authz: {
      requiredPrivileges: [CREATE_ENTITY_SOURCE_DEFINITION_PRIVILEGE],
    },
  },
  params: z.object({
    body: z.object({
      source: entitySourceDefinitionRt,
    }),
  }),
  handler: async ({ context, response, params, logger }) => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asInternalUser,
      logger,
      plugin: '@kbn/entityManager-plugin',
    });

    const result = await storeSourceDefinition(params.body.source, esClient);

    if (result.status === 'success') {
      return response.created({
        body: {
          type: result.resource,
        },
        headers: {
          location: `GET /internal/entities/v2/definitions/sources/${result.resource!.id}`,
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

const readSourceDefinitionsRoute = createEntityManagerServerRoute({
  endpoint: 'GET /internal/entities/v2/definitions/sources',
  security: {
    authz: {
      requiredPrivileges: [READ_ENTITY_SOURCE_DEFINITION_PRIVILEGE],
    },
  },
  handler: async ({ context, response, logger }) => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asInternalUser,
      logger,
      plugin: '@kbn/entityManager-plugin',
    });

    const result = await readSourceDefinitions(esClient);

    if (result.status === 'success') {
      return response.ok({
        body: {
          sources: result.resource,
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

export const sourceDefinitionRoutes = {
  ...createSourceDefinitionRoute,
  ...readSourceDefinitionsRoute,
};
