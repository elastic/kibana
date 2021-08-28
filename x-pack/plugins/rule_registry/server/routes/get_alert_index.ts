/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { validFeatureIds } from '@kbn/rule-data-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import * as t from 'io-ts';
import type { IRouter } from '../../../../../src/core/server/http/router/router';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import type { RacRequestHandlerContext } from '../types';
import { buildRouteValidation } from './utils/route_validation';

export const getAlertsIndexRoute = (router: IRouter<RacRequestHandlerContext>) => {
  router.get(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/index`,
      validate: {
        query: buildRouteValidation(
          t.exact(
            t.partial({
              features: t.string,
            })
          )
        ),
      },
      options: {
        tags: ['access:rac'],
      },
    },
    async (context, request, response) => {
      try {
        const alertsClient = await context.rac.getAlertsClient();
        const { features } = request.query;
        const indexName = await alertsClient.getAuthorizedAlertsIndices(
          features?.split(',') ?? validFeatureIds
        );
        return response.ok({
          body: { index_name: indexName },
        });
      } catch (exc) {
        const err = transformError(exc);
        const contentType = {
          'content-type': 'application/json',
        };
        const defaultedHeaders = {
          ...contentType,
        };

        return response.customError({
          headers: defaultedHeaders,
          statusCode: err.statusCode,
          body: {
            message: err.message,
            attributes: {
              success: false,
            },
          },
        });
      }
    }
  );
};
