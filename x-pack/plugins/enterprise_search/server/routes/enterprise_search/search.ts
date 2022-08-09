/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponseBody } from '@elastic/elasticsearch/lib/api/types';

import { schema } from '@kbn/config-schema';

import { ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT } from '../../../common/constants';

import { fetchSearchResults } from '../../lib/fetch_search_results';
import { RouteDependencies } from '../../plugin';

const calculateMeta = (searchResults: SearchResponseBody, page: number, size: number) => {
  let totalResults = 0;
  if (searchResults.hits.total === null || searchResults.hits.total === undefined) {
    totalResults = 0;
  } else if (typeof searchResults.hits.total === 'number') {
    totalResults = searchResults.hits.total;
  } else {
    totalResults = searchResults.hits.total.value;
  }
  const totalPages = Math.ceil(totalResults / size) || 1;

  return {
    page: {
      current: page,
      size: searchResults.hits.hits.length,
      total_pages: (Number.isFinite(totalPages) && totalPages) || 1,
      total_results: totalResults,
    },
  };
};

export function registerSearchRoute({ router }: RouteDependencies) {
  router.get(
    {
      path: '/internal/enterprise_search/indices/{index_name}/search',
      validate: {
        params: schema.object({
          index_name: schema.string(),
        }),
        query: schema.object({
          page: schema.number({ defaultValue: 0, min: 0 }),
          size: schema.number({
            defaultValue: ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT,
            min: 0,
          }),
        }),
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { page = 0, size = ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT } = request.query;
      const from = page * size;
      try {
        const searchResults: SearchResponseBody = await fetchSearchResults(
          client,
          request.params.index_name,
          '',
          from,
          size
        );

        return response.ok({
          body: {
            meta: calculateMeta(searchResults, page, size),
            results: searchResults,
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
  router.get(
    {
      path: '/internal/enterprise_search/indices/{index_name}/search/{query}',
      validate: {
        params: schema.object({
          index_name: schema.string(),
          query: schema.string(),
        }),
        query: schema.object({
          page: schema.number({ defaultValue: 0, min: 0 }),
          size: schema.number({
            defaultValue: ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT,
            min: 0,
          }),
        }),
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { page = 0, size = ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT } = request.query;
      const from = page * size;
      try {
        const searchResults = await fetchSearchResults(
          client,
          request.params.index_name,
          request.params.query,
          from,
          size
        );

        return response.ok({
          body: {
            meta: calculateMeta(searchResults, page, size),
            results: searchResults,
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
}
