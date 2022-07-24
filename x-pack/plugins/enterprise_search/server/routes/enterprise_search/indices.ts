/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { ErrorCode } from '../../../common/types/error_codes';

import { fetchConnectors } from '../../lib/connectors/fetch_connectors';

import { createApiIndex } from '../../lib/indices/create_index';
import { fetchIndex } from '../../lib/indices/fetch_index';
import { fetchIndices } from '../../lib/indices/fetch_indices';
import { generateApiKey } from '../../lib/indices/generate_api_key';
import { RouteDependencies } from '../../plugin';
import { createError } from '../../utils/create_error';
import { isIndexNotFoundException } from '../../utils/identify_exceptions';

export function registerIndexRoutes({ router }: RouteDependencies) {
  router.get(
    { path: '/internal/enterprise_search/search_indices', validate: false },
    async (context, _, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        const indices = await fetchIndices(client, '*', false);
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
          page: schema.number({ defaultValue: 0, min: 0 }),
          return_hidden_indices: schema.maybe(schema.boolean()),
          search_query: schema.maybe(schema.string()),
          size: schema.number({ defaultValue: 10, min: 0 }),
        }),
      },
    },
    async (context, request, response) => {
      const {
        page,
        size,
        return_hidden_indices: returnHiddenIndices,
        search_query: searchQuery,
      } = request.query;
      const { client } = (await context.core).elasticsearch;
      try {
        const indexPattern = searchQuery ? `*${searchQuery}*` : '*';
        const totalIndices = await fetchIndices(client, indexPattern, !!returnHiddenIndices);
        const totalResults = totalIndices.length;
        const totalPages = Math.ceil(totalResults / size) || 1;
        const startIndex = (page - 1) * size;
        const endIndex = page * size;
        const selectedIndices = totalIndices.slice(startIndex, endIndex);
        const indexNames = selectedIndices.map(({ name }) => name);
        const connectors = await fetchConnectors(client, indexNames);
        const indices = selectedIndices.map((index) => ({
          ...index,
          connector: connectors.find((connector) => connector.index_name === index.name),
        }));
        return response.ok({
          body: {
            indices,
            meta: {
              page: {
                current: page,
                size: indices.length,
                total_pages: totalPages,
                total_results: totalResults,
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
        if (isIndexNotFoundException(error)) {
          return createError({
            errorCode: ErrorCode.INDEX_NOT_FOUND,
            message: 'Could not find index',
            response,
            statusCode: 404,
          });
        }
        return response.customError({
          body: 'Error fetching data from Enterprise Search',
          statusCode: 502,
        });
      }
    }
  );
  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/exists',
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
        const indexExists = await client.asCurrentUser.indices.exists({ index: indexName });
        return response.ok({
          body: {
            exists: indexExists,
          },
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
  router.post(
    {
      path: '/internal/enterprise_search/indices',
      validate: {
        body: schema.object({
          index_name: schema.string(),
          language: schema.maybe(schema.nullable(schema.string())),
        }),
      },
    },
    async (context, request, response) => {
      const { ['index_name']: indexName, language } = request.body;
      const { client } = (await context.core).elasticsearch;
      try {
        const createIndexResponse = await createApiIndex(client, indexName, language);
        return response.ok({
          body: createIndexResponse,
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
