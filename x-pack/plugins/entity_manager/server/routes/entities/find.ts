/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { findEntitiesQuerySchema } from '@kbn/entities-schema';
import { z } from '@kbn/zod';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';

export const findEntitiesRoute = createEntityManagerServerRoute({
  endpoint: 'GET /internal/entities/_find',
  params: z.object({
    query: findEntitiesQuerySchema,
  }),
  handler: async ({ request, response, params, logger, getScopedClient }) => {
    try {
      const client = await getScopedClient({ request });
      const body = await client.findEntities(params.query);
      return response.ok({ body });
    } catch (e) {
      logger.error(e);
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
