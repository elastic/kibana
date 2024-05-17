/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import * as routePaths from '../../../common/constants_routes';
import { debug } from '../../../common/debug_log';
import { GetPodAssetsQueryOptions, getPodAssetsQueryOptionsRT } from '../../../common/types_api';
import { AssetsValidationError } from '../../lib/validators/validation_error';
import { SetupRouteOptions } from '../types';
import { getClientsFromContext, validateStringAssetFilters } from '../utils';

export function podsRoutes<T extends RequestHandlerContext>({
  router,
  assetClient,
}: SetupRouteOptions<T>) {
  const validate = createRouteValidationFunction(getPodAssetsQueryOptionsRT);
  router.get<unknown, GetPodAssetsQueryOptions, unknown>(
    {
      path: routePaths.GET_PODS,
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
        const response = await assetClient.getPods({
          from,
          to,
          filters,
          elasticsearchClient,
          savedObjectsClient,
        });

        return res.ok({ body: response });
      } catch (error: unknown) {
        debug('Error while looking up POD asset records', error);

        if (error instanceof AssetsValidationError) {
          return res.customError({
            statusCode: error.statusCode,
            body: {
              message: `Error while looking up pod asset records - ${error.message}`,
            },
          });
        }
        return res.customError({
          statusCode: 500,
          body: { message: 'Error while looking up pod asset records - ' + `${error}` },
        });
      }
    }
  );
}
