/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import { APIRoutes } from '../common/routes';
import { fetchIndices } from './lib/fetch_indices';
import { errorHandler } from './utils/error_handler';
import { DEFAULT_JSON_HEADERS, FETCH_INDICES_DEFAULT_SIZE } from './constants';

export function defineRoutes({
  logger,
  router,
  options: routeOptions,
}: {
  logger: Logger;
  router: IRouter;
  options: {
    hasIndexStats: boolean;
    getStartServices: StartServicesAccessor<{}, {}>;
  };
}) {
  router.get(
    {
      path: APIRoutes.GET_INDICES,
      validate: {
        query: schema.object({
          search_query: schema.maybe(schema.string()),
        }),
      },
    },
    errorHandler(logger, async (context, request, response) => {
      const { search_query: searchQuery } = request.query;
      const {
        client: { asCurrentUser: client },
      } = (await context.core).elasticsearch;

      const body = await fetchIndices(searchQuery, FETCH_INDICES_DEFAULT_SIZE, {
        client,
        hasIndexStats: routeOptions.hasIndexStats,
        logger,
      });

      return response.ok({
        body,
        headers: DEFAULT_JSON_HEADERS,
      });
    })
  );
}
