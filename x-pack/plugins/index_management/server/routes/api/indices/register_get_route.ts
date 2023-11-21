/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { KbnServerError, reportServerError } from '@kbn/kibana-utils-plugin/server';
import { fetchIndices } from '../../../lib/fetch_indices';
import { RouteDependencies } from '../../../types';
import { addInternalBasePath } from '..';

export function registerGetRoute({
  router,
  indexDataEnricher,
  lib: { handleEsError },
  config,
}: RouteDependencies) {
  router.get(
    {
      path: addInternalBasePath('/indices/{indexName}'),
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client as IScopedClusterClient;
      const { indexName } = request.params;
      try {
        const indices = await fetchIndices({
          client,
          indexDataEnricher,
          indexNames: [indexName],
          config,
        });
        if (indices.length !== 1) {
          return reportServerError(
            response,
            new KbnServerError(`Data for index ${indexName} was not found`, 400)
          );
        }
        return response.ok({ body: indices[0] });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
