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
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

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

export function registerSearchRoute({ router, log }: RouteDependencies) {
  router.post(
    {
      path: '/internal/enterprise_search/indices/{index_name}/search',
      validate: {
        body: schema.object({
          searchQuery: schema.string({
            defaultValue: '',
          }),
        }),
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
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.index_name);
      const searchQuery = request.body.searchQuery;
      const { client } = (await context.core).elasticsearch;
      const { page = 0, size = ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT } = request.query;
      const from = page * size;
      const searchResults: SearchResponseBody = await fetchSearchResults(
        client,
        indexName,
        searchQuery,
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
    })
  );
}
