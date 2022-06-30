/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { fetchSearchResults } from '../../lib/fetch_search_results';
import { RouteDependencies } from '../../plugin';

export function registerSearchRoute({ router }: RouteDependencies) {
  router.get(
    {
      path: '/internal/enterprise_search/{index_name}/search/{query}',
      validate: {
        params: schema.object({
          index_name: schema.string(),
          query: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        const searchResults = await fetchSearchResults(
          client,
          request.params.index_name,
          request.params.query
        );
        return response.ok({
          body: searchResults,
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
}
