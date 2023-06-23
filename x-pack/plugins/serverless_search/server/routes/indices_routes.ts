/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesIndexState } from '@elastic/elasticsearch/lib/api/types';
import { schema } from '@kbn/config-schema';
import { IScopedClusterClient } from '@kbn/core/server';

import { isNotNullish } from '../../common/utils/is_not_nullish';
import { RouteDependencies } from '../plugin';

export const registerIndicesRoutes = ({ router, security }: RouteDependencies) => {
  router.get(
    {
      path: '/internal/serverless_search/indices',
      validate: {
        query: schema.object({
          from: schema.number({ defaultValue: 0, min: 0 }),
          search_query: schema.maybe(schema.string()),
          size: schema.number({ defaultValue: 20, min: 0 }),
        }),
      },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client;
      const user = security.authc.getCurrentUser(request);

      if (!user) {
        return response.customError({
          statusCode: 502,
          body: 'Could not retrieve current user, security plugin is not ready',
        });
      }
      const { from, size, search_query: searchQuery } = request.query;
      const indexPattern = searchQuery ? `*${searchQuery}*` : '*';
      const indexMatches = await client.asCurrentUser.indices.get({
        expand_wildcards: ['open'],
        // for better performance only compute aliases and settings of indices but not mappings
        features: ['aliases', 'settings'],
        index: indexPattern,
      });
      const indexNames = Object.keys(indexMatches).filter(
        (indexName) =>
          indexMatches[indexName] &&
          !isHidden(indexMatches[indexName]) &&
          !isClosed(indexMatches[indexName])
      );
      const indexNameSlice = indexNames.slice(from, from + size).filter(isNotNullish);
      if (indexNameSlice.length === 0) {
        return response.ok({
          body: {
            indices: [],
          },
          headers: { 'content-type': 'application/json' },
        });
      }
      const indexCounts = await fetchIndexCounts(client, indexNameSlice);

      const indices = indexNameSlice.map((name) => ({
        name,
        count: indexCounts[name] ?? 0,
      }));
      return response.ok({
        body: {
          indices,
        },
        headers: { 'content-type': 'application/json' },
      });
    }
  );
};

function isHidden(index: IndicesIndexState): boolean {
  return index.settings?.index?.hidden === true || index.settings?.index?.hidden === 'true';
}
function isClosed(index: IndicesIndexState): boolean {
  return (
    index.settings?.index?.verified_before_close === true ||
    index.settings?.index?.verified_before_close === 'true'
  );
}

const fetchIndexCounts = async (client: IScopedClusterClient, indicesNames: string[]) => {
  // TODO: is there way to batch this? Passing multiple index names or a pattern still returns a singular count
  const countPromises = indicesNames.map(async (indexName) => {
    const { count } = await client.asCurrentUser.count({ index: indexName });
    return { [indexName]: count };
  });
  const indexCountArray = await Promise.all(countPromises);
  return indexCountArray.reduce((acc, current) => Object.assign(acc, current), {});
};
