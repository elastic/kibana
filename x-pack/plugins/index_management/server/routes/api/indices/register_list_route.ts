/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchIndices } from '../../../lib/fetch_indices';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

export function registerListRoute({
  router,
  indexDataEnricher,
  lib: { handleEsError },
}: RouteDependencies) {
  router.get(
    { path: addBasePath('/indices'), validate: false },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        const indices = await fetchIndices(client, indexDataEnricher);
        return response.ok({ body: indices });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
