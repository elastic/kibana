/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { RequestHandlerContext } from '@kbn/core/server';
import { getEntityDefinitionQuerySchema } from '@kbn/entities-schema';
import { SetupRouteOptions } from '../types';

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
export function getEntityDefinitionRoute<T extends RequestHandlerContext>({
  router,
  getScopedClient,
  logger,
}: SetupRouteOptions<T>) {
  router.get<{ id?: string }, { page?: number; perPage?: number }, unknown>(
    {
      path: '/internal/entities/definition/{id?}',
      validate: {
        query: getEntityDefinitionQuerySchema.strict(),
        params: z.object({ id: z.optional(z.string()) }),
      },
    },
    async (context, request, res) => {
      try {
        const client = await getScopedClient({ request });
        const result = await client.getEntityDefinitions({
          page: request.query.page,
          perPage: request.query.perPage,
        });

        return res.ok({ body: result });
      } catch (e) {
        logger.error(e);
        return res.customError({ body: e, statusCode: 500 });
      }
    }
  );
}
