/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { z } from '@kbn/zod';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';
import { entitySourceSchema } from '../../lib/queries';
import { UnknownEntityType } from '../../lib/entities/errors/unknown_entity_type';

export const searchEntitiesRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/v2/_search',
  params: z.object({
    body: z.object({
      type: z.string(),
      metadata_fields: z.optional(z.array(z.string())).default([]),
      filters: z.optional(z.array(z.string())).default([]),
      start: z
        .optional(z.string())
        .default(() => moment().subtract(5, 'minutes').toISOString())
        .refine((val) => moment(val).isValid(), {
          message: '[start] should be a date in ISO format',
        }),
      end: z
        .optional(z.string())
        .default(() => moment().toISOString())
        .refine((val) => moment(val).isValid(), {
          message: '[end] should be a date in ISO format',
        }),
      sort_by: z.optional(
        z.object({
          field: z.string(),
          direction: z.enum(['ASC', 'DESC']),
        })
      ),
      limit: z.optional(z.number()).default(10),
    }),
  }),
  handler: async ({ request, response, params, logger, getScopedClient }) => {
    try {
      const {
        type,
        start,
        end,
        limit,
        filters,
        metadata_fields: metadataFields,
        sort_by: sortBy,
      } = params.body;

      const client = await getScopedClient({ request });
      const entities = await client.searchEntities({
        type,
        filters,
        metadataFields,
        start,
        end,
        sortBy,
        limit,
      });

      return response.ok({ body: { entities } });
    } catch (e) {
      logger.error(e);

      if (e instanceof UnknownEntityType) {
        return response.notFound({ body: e });
      }

      return response.customError({ body: e, statusCode: 500 });
    }
  },
});

export const searchEntitiesPreviewRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/v2/_search/preview',
  params: z.object({
    body: z.object({
      sources: z.array(entitySourceSchema),
      start: z
        .optional(z.string())
        .default(() => moment().subtract(5, 'minutes').toISOString())
        .refine((val) => moment(val).isValid(), {
          message: '[start] should be a date in ISO format',
        }),
      end: z
        .optional(z.string())
        .default(() => moment().toISOString())
        .refine((val) => moment(val).isValid(), {
          message: '[end] should be a date in ISO format',
        }),
      sort_by: z.optional(
        z.object({
          field: z.string(),
          direction: z.enum(['ASC', 'DESC']),
        })
      ),
      limit: z.optional(z.number()).default(10),
    }),
  }),
  handler: async ({ request, response, params, getScopedClient }) => {
    const { sources, start, end, limit, sort_by: sortBy } = params.body;

    const client = await getScopedClient({ request });
    const entities = await client.searchEntitiesBySources({
      sources,
      start,
      end,
      sortBy,
      limit,
    });

    return response.ok({ body: { entities } });
  },
});
