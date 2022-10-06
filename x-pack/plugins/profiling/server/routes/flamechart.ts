/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { type RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import { handleRouteHandlerError } from '../utils/handle_route_error_handler';

export function registerFlameChartSearchRoute({
  router,
  logger,
  services: { getFlameGraph },
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  router.get(
    {
      path: paths.Flamechart,
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
        const flamegraph = await getFlameGraph({
          request,
          context,
          timeFrom,
          timeTo,
          kuery,
          logger,
        });

        return response.ok({ body: flamegraph });
      } catch (error) {
        return handleRouteHandlerError({ error, logger, response });
      }
    }
  );
}
