/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import {
  GetContainerAssetsQueryOptions,
  getContainerAssetsQueryOptionsRT,
} from '../../../common/types_api';
import { debug } from '../../../common/debug_log';
import { SetupRouteOptions } from '../types';
import * as routePaths from '../../../common/constants_routes';
import { getClientsFromContext, validateStringAssetFilters } from '../utils';
import { AssetsValidationError } from '../../lib/validators/validation_error';

export function containersRoutes<T extends RequestHandlerContext>({
  router,
  server,
}: SetupRouteOptions<T>) {
  const validate = createRouteValidationFunction(getContainerAssetsQueryOptionsRT);
  router.get<unknown, GetContainerAssetsQueryOptions, unknown>(
    {
      path: routePaths.GET_CONTAINERS,
      validate: {
        query: (q, res) => {
          const [invalidResponse, validatedFilters] = validateStringAssetFilters(q, res);
          if (invalidResponse) {
            return invalidResponse;
          }
          if (validatedFilters) {
            q.filters = validatedFilters;
          }
          return validate(q, res);
        },
      },
    },
    async (context, req, res) => {
      const { from = 'now-24h', to = 'now', filters } = req.query || {};
      const { elasticsearchClient, savedObjectsClient } = await getClientsFromContext(context);

      try {
        const response = await server.assetClient.getContainers({
          from,
          to,
          filters, // safe due to route validation, are there better ways to do this?
          elasticsearchClient,
          savedObjectsClient,
        });

        return res.ok({ body: response });
      } catch (error: unknown) {
        debug('Error while looking up CONTAINER asset records', error);

        if (error instanceof AssetsValidationError) {
          return res.customError({
            statusCode: error.statusCode,
            body: {
              message: `Error while looking up container asset records - ${error.message}`,
            },
          });
        }
        return res.customError({
          statusCode: 500,
          body: { message: 'Error while looking up container asset records - ' + `${error}` },
        });
      }
    }
  );
}
