/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityDefinitionQuerySchema } from '@kbn/entities-schema';
import { z } from '@kbn/zod';
import { findEntityDefinitions } from '../../lib/entities/find_entity_definition';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';

/**
 * @openapi
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
 */
export const getEntityDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'GET /internal/entities/definition',
  params: z.object({
    query: getEntityDefinitionQuerySchema,
  }),
  handler: async ({ context, params, response }) => {
    try {
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      const soClient = (await context.core).savedObjects.client;
      const definitions = await findEntityDefinitions({
        esClient,
        soClient,
        page: params?.query?.page ?? 1,
        perPage: params?.query?.perPage ?? 10,
      });
      return response.ok({ body: { definitions } });
    } catch (e) {
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
