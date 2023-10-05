/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import {
  GetServiceAssetsQueryOptions,
  getServiceAssetsQueryOptionsRT,
} from '../../../common/types_api';
import { debug } from '../../../common/debug_log';
import { SetupRouteOptions } from '../types';
import * as routePaths from '../../../common/constants_routes';
import { getClientsFromContext } from '../utils';
import { AssetsValidationError } from '../../lib/validators/validation_error';

export function servicesRoutes<T extends RequestHandlerContext>({
  router,
  assetClient,
}: SetupRouteOptions<T>) {
  // GET /assets/services
  router.get<unknown, GetServiceAssetsQueryOptions, unknown>(
    {
      path: routePaths.GET_SERVICES,
      validate: {
        query: createRouteValidationFunction(getServiceAssetsQueryOptionsRT),
      },
    },
    async (context, req, res) => {
      const { from = 'now-24h', to = 'now', parent } = req.query || {};
      const { elasticsearchClient, savedObjectsClient } = await getClientsFromContext(context);
      try {
        const response = await assetClient.getServices({
          from,
          to,
          parent,
          elasticsearchClient,
          savedObjectsClient,
        });

        return res.ok({ body: response });
      } catch (error: unknown) {
        debug('Error while looking up SERVICE asset records', error);

        if (error instanceof AssetsValidationError) {
          return res.customError({
            statusCode: error.statusCode,
            body: {
              message: `Error while looking up service asset records - ${error.message}`,
            },
          });
        }

        return res.customError({
          statusCode: 500,
          body: { message: 'Error while looking up service asset records - ' + `${error}` },
        });
      }
    }
  );
}
