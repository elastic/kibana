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
import { findEntityDefinitions } from '../../lib/entities/find_entity_definition';

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
    async (context, req, res) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const soClient = (await context.core).savedObjects.client;
        const definitions = await findEntityDefinitions({
          esClient,
          soClient,
          page: req.query.page ?? 1,
          perPage: req.query.perPage ?? 10,
          id: req.params.id,
        });
        return res.ok({ body: { definitions } });
      } catch (e) {
        logger.error(e);
        return res.customError({ body: e, statusCode: 500 });
      }
    }
  );
}
