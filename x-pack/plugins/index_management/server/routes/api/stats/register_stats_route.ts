/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesStatsResponse } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const paramsSchema = schema.object({
  indexName: schema.string(),
});

function formatHit(hit: IndicesStatsResponse, indexName: string) {
  const { _shards, indices } = hit;
  const stats = indices[indexName];
  return {
    _shards,
    stats,
  };
}

export function registerStatsRoute({ router, lib }: RouteDependencies) {
  router.get(
    { path: addBasePath('/stats/{indexName}'), validate: { params: paramsSchema } },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;
      const { indexName } = request.params as typeof paramsSchema.type;
      const params = {
        expand_wildcards: 'none',
        index: indexName,
      };

      try {
        const { body: hit } = await client.asCurrentUser.indices.stats(params);
        return response.ok({ body: formatHit(hit, indexName) });
      } catch (e) {
        if (lib.isEsError(e)) {
          return response.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        throw e;
      }
    }
  );
}
