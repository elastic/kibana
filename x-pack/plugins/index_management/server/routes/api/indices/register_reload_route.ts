/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { fetchIndices } from '../../../lib/fetch_indices';
import { addBasePath } from '../index';

const bodySchema = schema.maybe(
  schema.object({
    indexNames: schema.maybe(schema.arrayOf(schema.string())),
  })
);

export function registerReloadRoute({
  router,
  indexDataEnricher,
  lib: { handleEsError },
}: RouteDependencies) {
  router.post(
    { path: addBasePath('/indices/reload'), validate: { body: bodySchema } },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { indexNames = [] } = (request.body as typeof bodySchema.type) ?? {};

      try {
        const indices = await fetchIndices(client, indexDataEnricher, indexNames);
        return response.ok({ body: indices });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
