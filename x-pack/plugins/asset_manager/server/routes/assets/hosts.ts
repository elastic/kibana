/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { GetHostAssetsQueryOptions, getHostAssetsQueryOptionsRT } from '../../../common/types_api';
import { debug } from '../../../common/debug_log';
import { SetupRouteOptions } from '../types';
import * as routePaths from '../../../common/constants_routes';
import { getClientsFromContext } from '../utils';

export function hostsRoutes<T extends RequestHandlerContext>({
  router,
  assetClient,
}: SetupRouteOptions<T>) {
  router.get<unknown, GetHostAssetsQueryOptions, unknown>(
    {
      path: routePaths.GET_HOSTS,
      validate: {
        query: createRouteValidationFunction(getHostAssetsQueryOptionsRT),
      },
    },
    async (context, req, res) => {
      const { from = 'now-24h', to = 'now' } = req.query || {};

      const { elasticsearchClient, savedObjectsClient } = await getClientsFromContext(context);

      try {
        const response = await assetClient.getHosts({
          from: datemath.parse(from)!.toISOString(),
          to: datemath.parse(to)!.toISOString(),
          elasticsearchClient,
          savedObjectsClient,
        });

        return res.ok({ body: response });
      } catch (error: unknown) {
        debug('Error while looking up HOST asset records', error);
        return res.customError({
          statusCode: 500,
          body: { message: 'Error while looking up host asset records - ' + `${error}` },
        });
      }
    }
  );
}
