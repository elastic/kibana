/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityDefinitionParamsSchema } from '@kbn/entities-schema';
import { z } from '@kbn/zod';
import { BooleanFromString } from '@kbn/zod-helpers';
import { createEntityManagerServerRoute } from '../../create_entity_manager_server_route';

/** @openapi
 * /internal/entities/definition/{id}:
 *   get:
 *     description: Get an entity definition.
 *     tags:
 *       - definitions
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           $ref: '#/components/schemas/getEntityDefinitionParamsSchema/properties/id'
 *       - in: query
 *         name: includeState
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/entityDefinitionSchema'
 *       404:
 *         description: Entity definition does not exist
 */
export const getEntityDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'GET /internal/entities/definition/{id}',
  params: z.object({
    path: getEntityDefinitionParamsSchema,
    query: z.object({
      includeState: z.optional(BooleanFromString).default(false),
    }),
  }),
  handler: async ({ request, response, params, logger, getScopedClient }) => {
    try {
      const client = await getScopedClient({ request });
      const result = await client.getEntityDefinition({
        id: params.path.id,
        includeState: params.query.includeState,
      });

      if (!result) {
        return response.notFound();
      }

      return response.ok({ body: result });
    } catch (e) {
      logger.error(e);
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
