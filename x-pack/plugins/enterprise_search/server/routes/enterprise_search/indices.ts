/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { fetchIndex } from '../../lib/indices/fetch_index';
import { fetchIndices } from '../../lib/indices/fetch_indices';
import { generateApiKey } from '../../lib/indices/generate_api_key';
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
          body: 'Error fetching data from Enterprise Search',
          statusCode: 502,
        });
      }
    }
  );
  router.get(
    {
      path: '/internal/enterprise_search/indices',
      validate: {
        query: schema.object({
          page: schema.number({ defaultValue: 1, min: 0 }),
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
        const startIndex = (page - 1) * size;
        const endIndex = page * size;
        return response.ok({
          body: {
            indices: indices.slice(startIndex, endIndex),
            meta: {
              page: {
                current: page,
                size,
                totalPages,
                totalResults,
              },
            },
          },
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        return response.customError({
          body: 'Error fetching index data from Elasticsearch',
          statusCode: 502,
        });
      }
    }
  );
  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { indexName } = request.params;
      const { client } = (await context.core).elasticsearch;
      try {
        const index = await fetchIndex(client, indexName);
        return response.ok({
          body: index,
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        return response.customError({
          body: 'Error fetching data from Enterprise Search',
          statusCode: 502,
        });
      }
    }
  );
  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/api_key',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { indexName } = request.params;
      const { client } = (await context.core).elasticsearch;
      try {
        const apiKey = await generateApiKey(client, indexName);
        return response.ok({
          body: apiKey,
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        return response.customError({
          body: 'Error fetching data from Enterprise Search',
          statusCode: 502,
        });
      }
    }
  );
}
