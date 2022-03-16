/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpResponsePayload } from 'kibana/server';

import { fetchIndices } from '../../lib/fetch_indices';
import { RouteDependencies } from '../../plugin';

export function registerListRoute({ router }: RouteDependencies) {
  router.get(
    { path: '/internal/enterprise_search/indices', validate: false },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;
      try {
        const indices = await fetchIndices(client);
        return response.ok({
          body: indices as HttpResponsePayload,
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
