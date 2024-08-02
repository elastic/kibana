/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { getEntityDefinitionQuerySchema } from '@kbn/entities-schema';
import { SetupRouteOptions } from '../types';
import { findEntityDefinitions } from '../../lib/entities/find_entity_definition';

export function getEntityDefinitionRoute<T extends RequestHandlerContext>({
  router,
}: SetupRouteOptions<T>) {
  router.get<unknown, { page?: number; perPage?: number }, unknown>(
    {
      path: '/internal/entities/definition',
      validate: {
        query: buildRouteValidationWithZod(getEntityDefinitionQuerySchema.strict()),
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
        });
        return res.ok({ body: { definitions } });
      } catch (e) {
        return res.customError({ body: e, statusCode: 500 });
      }
    }
  );
}
