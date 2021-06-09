/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import { IScopedClusterClient } from 'kibana/server';
import { reduce, size } from 'lodash';
import { RouteDependencies } from '../../../types';

const bodySchema = schema.object({ pattern: schema.string() }, { unknowns: 'allow' });

function getIndexNamesFromAliasesResponse(json: Record<string, any>) {
  return reduce(
    json,
    (list, { aliases }, indexName) => {
      list.push(indexName);
      if (size(aliases) > 0) {
        list.push(...Object.keys(aliases));
      }
      return list;
    },
    [] as string[]
  );
}

async function getIndices(dataClient: IScopedClusterClient, pattern: string, limit = 10) {
  const aliasResult = await dataClient.asCurrentUser.indices.getAlias(
    {
      index: pattern,
    },
    {
      ignore: [404],
    }
  );

  if (aliasResult.statusCode !== 404) {
    const indicesFromAliasResponse = getIndexNamesFromAliasesResponse(aliasResult.body);
    return indicesFromAliasResponse.slice(0, limit);
  }

  const response = await dataClient.asCurrentUser.search(
    {
      index: pattern,
      body: {
        size: 0, // no hits
        aggs: {
          indices: {
            terms: {
              field: '_index',
              size: limit,
            },
          },
        },
      },
    },
    {
      ignore: [404],
    }
  );
  if (response.statusCode === 404 || !response.body.aggregations) {
    return [];
  }
  const indices = response.body.aggregations.indices as estypes.AggregationsMultiBucketAggregate<{
    key: unknown;
  }>;

  return indices.buckets ? indices.buckets.map((bucket) => bucket.key) : [];
}

export function registerGetRoute({ router, license, lib: { handleEsError } }: RouteDependencies) {
  router.post(
    {
      path: '/api/watcher/indices',
      validate: {
        body: bodySchema,
      },
    },
    license.guardApiRoute(async (ctx, request, response) => {
      const { pattern } = request.body;

      try {
        const indices = await getIndices(ctx.core.elasticsearch.client, pattern);
        return response.ok({ body: { indices } });
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    })
  );
}
