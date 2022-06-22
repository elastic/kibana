/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { fetchIndices } from '../../lib/fetch_indices';
import { RouteDependencies } from '../../plugin';

export function registerIndexRoutes({ router }: RouteDependencies) {
  router.get(
    { path: '/internal/enterprise_search/search_indices', validate: false },
    async (context, _, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        const indices = await fetchIndices(client, 'search-*', /^search-.*/);
        return response.ok({
          body: indices,
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        return response.customError({
          statusCode: 502,
          body: 'Error fetching data from Enterprise Search',
        });
      }
    }
  );
  router.get(
    {
      path: '/internal/enterprise_search/indices',
      validate: {
        query: schema.object({
          page: schema.number({ defaultValue: 0, min: 0 }),
          size: schema.number({ defaultValue: 10, min: 0 }),
        }),
      },
    },
    async (context, request, response) => {
      const { page, size } = request.query;
      const { client } = (await context.core).elasticsearch;
      try {
        const indices = await fetchIndices(client, '*', /.*/);
        const totalResults = indices.length;
        const totalPages = Math.ceil(totalResults / size);
        const startIndex = page * size;
        const endIndex = (page + 1) * size;
        return response.ok({
          body: {
            meta: {
              page: {
                current: page,
                size,
                totalPages,
                totalResults,
              },
            },
            indices: indices.slice(startIndex, endIndex),
          },
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        return response.customError({
          statusCode: 502,
          body: 'Error fetching index data from Elasticsearch',
        });
      }
    }
  );
}
