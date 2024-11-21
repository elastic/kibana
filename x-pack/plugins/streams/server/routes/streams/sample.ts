/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { notFound, internal } from '@hapi/boom';
import { conditionSchema } from '../../../common/types';
import { createServerRoute } from '../create_server_route';
import { DefinitionNotFound } from '../../lib/streams/errors';
import { readAncestors, readStream } from '../../lib/streams/stream_crud';
import { StreamDefinition } from '../../../common';
import { conditionToQueryDsl } from '../../lib/streams/helpers/condition_to_query_dsl';
import { getFields } from '../../lib/streams/helpers/condition_fields';

export const readStreamRoute = createServerRoute({
  endpoint: 'GET /api/streams/{id}/_sample',
  options: {
    access: 'internal',
    security: {
      authz: {
        enabled: false,
        reason:
          'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
      },
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
    body: z.object({
      condition: z.optional(conditionSchema),
      start: z.optional(z.number()),
      end: z.optional(z.number()),
      number: z.optional(z.number()),
    }),
  }),
  handler: async ({ response, params, request, logger, getScopedClients }): Promise<unknown[]> => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });
      const streamEntity = await readStream({
        scopedClusterClient,
        id: params.path.id,
      });
      const results = await scopedClusterClient.asCurrentUser.search({
        index: params.path.id,
        body: {
          query: {
            bool: {
              must: [
                conditionToQueryDsl(params.body.condition),
                {
                  range: {
                    '@timestamp': {
                      gte: params.body.start,
                      lte: params.body.end,
                    },
                  },
                },
              ],
            },
          },
          runtime_mappings: Object.fromEntries(
            getFields(params.body.condition).map((field) => [field, { type: 'keyword' }])
          ),
          size: params.body.number,
        },
      });

      return results.hits.hits.map((hit) => hit._source);
    } catch (e) {
      if (e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      throw internal(e);
    }
  },
});
