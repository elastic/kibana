/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { fetchIndices } from '../lib/indices/fetch_indices';
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
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const user = security.authc.getCurrentUser(request);

      if (!user) {
        return response.customError({
          statusCode: 502,
          body: 'Could not retrieve current user, security plugin is not ready',
        });
      }

      const { from, size, search_query: searchQuery } = request.query;

      const indices = await fetchIndices(client, from, size, searchQuery);
      return response.ok({
        body: {
          indices,
        },
        headers: { 'content-type': 'application/json' },
      });
    }
  );
};
