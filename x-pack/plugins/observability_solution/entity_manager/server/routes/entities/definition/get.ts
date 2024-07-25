/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityDefinitionParamsSchema } from '@kbn/entities-schema';
import { z } from '@kbn/zod';
import { createEntityManagerServerRoute } from '../../create_entity_manager_server_route';

/** @openapi
 * /internal/entities/definition:
 *   get:
 *     description: Get all installed entity definitions.
 *     tags:
 *       - definitions
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           $ref: '#/components/schemas/getEntityDefinitionQuerySchema/properties/page'
 *       - in: query
 *         name: perPage
 *         schema:
 *           $ref: '#/components/schemas/getEntityDefinitionQuerySchema/properties/perPage'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 definitions:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/entityDefinitionSchema'
 *                       - type: object
 *                         properties:
 *                           state:
 *                            type: object
 *                            properties:
 *                              installed:
 *                                type: boolean
 *                              running:
 *                                type: boolean
 *       404:
 *         description: Not found
 */
export const getEntityDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'GET /internal/entities/definition/{id}',
  params: z.object({
    path: getEntityDefinitionParamsSchema,
  }),
  handler: async ({ request, response, params, logger, getScopedClient }) => {
    try {
      const client = await getScopedClient({ request });
      const result = await client.getEntityDefinition({
        id: params.path.id,
      });

      if (result === null) {
        return response.notFound();
      }

      return response.ok({ body: result });
    } catch (e) {
      logger.error(e);
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
