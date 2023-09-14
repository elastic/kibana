/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import { handleRouteHandlerError } from '../utils/handle_route_error_handler';
import { getClient } from './compat';

export function registerFlameChartSearchRoute({
  router,
  logger,
  dependencies: {
    start: { profilingDataAccess },
  },
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  router.get(
    {
      path: paths.Flamechart,
      options: { tags: ['access:profiling'] },
      validate: {
        query: schema.object({
          timeFrom: schema.number(),
          timeTo: schema.number(),
          kuery: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { timeFrom, timeTo, kuery } = request.query;

      try {
        const esClient = await getClient(context);
        const flamegraph = await profilingDataAccess.services.fetchFlamechartData({
          esClient,
          rangeFrom: timeFrom,
          rangeTo: timeTo,
          kuery,
        });

        return response.ok({ body: flamegraph });
      } catch (error) {
        return handleRouteHandlerError({
          error,
          logger,
          response,
          message: 'Error while fetching flamegraph',
        });
      }
    }
  );
}
