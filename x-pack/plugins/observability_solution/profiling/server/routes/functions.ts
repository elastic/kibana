/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { kqlQuery } from '@kbn/observability-plugin/server';
import { profilingFetchTopNFunctionsFromStacktraces } from '@kbn/observability-plugin/common';
import { IDLE_SOCKET_TIMEOUT, RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import { handleRouteHandlerError } from '../utils/handle_route_error_handler';
import { getClient } from './compat';

const querySchema = schema.object({
  timeFrom: schema.number(),
  timeTo: schema.number(),
  startIndex: schema.number(),
  endIndex: schema.number(),
  kuery: schema.string(),
});

type QuerySchemaType = TypeOf<typeof querySchema>;

export function registerTopNFunctionsSearchRoute({
  router,
  logger,
  dependencies: {
    start: { profilingDataAccess },
  },
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  router.get(
    {
      path: paths.TopNFunctions,
      options: { tags: ['access:profiling'], timeout: { idleSocket: IDLE_SOCKET_TIMEOUT } },
      validate: { query: querySchema },
    },
    async (context, request, response) => {
      try {
        const core = await context.core;

        const { timeFrom, timeTo, startIndex, endIndex, kuery }: QuerySchemaType = request.query;
        const startSecs = timeFrom / 1000;
        const endSecs = timeTo / 1000;

        const esClient = await getClient(context);

        const query = {
          bool: {
            filter: [
              ...kqlQuery(kuery),
              {
                range: {
                  ['@timestamp']: {
                    gte: String(startSecs),
                    lt: String(endSecs),
                    format: 'epoch_second',
                  },
                },
              },
            ],
          },
        };

        const useStacktracesAPI = await core.uiSettings.client.get<boolean>(
          profilingFetchTopNFunctionsFromStacktraces
        );

        const topNFunctions = useStacktracesAPI
          ? await profilingDataAccess.services.fetchFunctions({
              core,
              esClient,
              startIndex,
              endIndex,
              totalSeconds: endSecs - startSecs,
              query,
            })
          : await profilingDataAccess.services.fetchESFunctions({
              core,
              esClient,
              query,
              aggregationField: 'service.name',
            });

        return response.ok({
          body: topNFunctions,
        });
      } catch (error) {
        return handleRouteHandlerError({
          error,
          logger,
          response,
          message: 'Error while fetching TopN functions',
        });
      }
    }
  );
}
