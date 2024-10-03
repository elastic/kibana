/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { apiEntityDefinitionSchema } from '@kbn/entities-schema';
import { JsonObject } from '@kbn/utility-types';
import { EntityDefinitionNotFound } from '../../../../lib/entities/errors/entity_not_found';
import { createEntityManagerServerRoute } from '../../../create_entity_manager_server_route';
import { createEntitiesFromApiDefinition } from '../../../../lib/entities/tasks/lib/create_entities_from_api_definition';

export const previewEntityApiDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/api/definition/_preview',
  params: z.object({
    body: apiEntityDefinitionSchema,
  }),
  handler: async ({ request, response, params, logger, getScopedClients }) => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });
      const docs = await createEntitiesFromApiDefinition(
        scopedClusterClient.asCurrentUser,
        params.body
      );

      return response.ok({
        body: {
          docs: docs.map((doc: JsonObject) => ({
            ...doc,
            event: { ingested: new Date().toISOString() },
          })),
        },
      });
    } catch (e) {
      logger.error(e);

      if (e instanceof EntityDefinitionNotFound) {
        return response.notFound({ body: e });
      }
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
