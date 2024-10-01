/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { updateEntityPathSchema } from '@kbn/entities-schema';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';

export const updateEntityRoute = createEntityManagerServerRoute({
  endpoint: 'PUT /internal/entities/{definitionId}/{id}',
  params: z.object({
    path: updateEntityPathSchema,
    body: z.record(z.string(), z.any()),
  }),
  handler: async ({ request, response, params, logger, getScopedClient }) => {
    try {
      const client = await getScopedClient({ request });
      await client.updateEntity({ ...params.path, doc: params.body });
      const entity = await client.findEntity({ ...params.path });
      return response.ok({ body: entity });
    } catch (e) {
      logger.error(e);
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
