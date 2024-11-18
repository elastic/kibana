/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { z } from '@kbn/zod';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';
import { EntitySource, entitySourceSchema } from '../../lib/queries';

export const searchEntitiesRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/_search',
  params: z.object({
    body: z.object({
      type: z.string(),
      limit: z.optional(z.number()).default(10),
    }),
  }),
  handler: async ({ request, response, params, logger, getScopedClient }) => {
    try {
      const { type, limit } = params.body;

      const client = await getScopedClient({ request });
      const sources = [
        {
          type: 'service',
          index_patterns: ['remote_cluster:logs-*'],
          identity_fields: ['service.name', 'service.environment'],
          metadata_fields: [],
          filters: [],
        },
      ] as EntitySource[]; // get sources for the type

      const entities = await client.searchEntities({ sources, limit });

      return response.ok({ body: { entities } });
    } catch (e) {
      logger.error(e);
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});

export const searchEntitiesPreviewRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/_search/preview',
  params: z.object({
    body: z.object({
      sources: z.array(
        entitySourceSchema.transform((source) => ({
          ...source,
          filters: [
            ...source.filters,
            `@timestamp >= "${moment().subtract(5, 'minutes').toISOString()}"`,
          ],
        }))
      ),
      limit: z.optional(z.number()).default(10),
    }),
  }),
  handler: async ({ request, response, params, logger, getScopedClient }) => {
    try {
      const { sources, limit } = params.body;

      const client = await getScopedClient({ request });
      const entities = await client.searchEntities({
        sources,
        limit,
      });

      return response.ok({ body: { entities } });
    } catch (e) {
      logger.error(e);
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
