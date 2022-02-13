/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const paramsSchema = schema.object({
  indexName: schema.string(),
});

interface Hit {
  _shards: unknown;
  indices?: Record<string, estypes.IndicesStatsIndicesStats>;
}

function formatHit(hit: Hit, indexName: string) {
  const { _shards, indices } = hit;
  const stats = indices![indexName];
  return {
    _shards,
    stats,
  };
}

export function registerStatsRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    { path: addBasePath('/stats/{indexName}'), validate: { params: paramsSchema } },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;
      const { indexName } = request.params as typeof paramsSchema.type;
      const params = {
        expand_wildcards: 'none' as const,
        index: indexName,
      };

      try {
        const hit = await client.asCurrentUser.indices.stats(params);

        return response.ok({ body: formatHit(hit, indexName) });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
