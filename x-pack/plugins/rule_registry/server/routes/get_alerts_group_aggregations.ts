/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import * as t from 'io-ts';
import { transformError } from '@kbn/securitysolution-es-utils';

import { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { buildRouteValidation } from './utils/route_validation';
import { alertsAggregationsSchema } from '../../common/types';

export const getAlertsGroupAggregations = (router: IRouter<RacRequestHandlerContext>) => {
  router.post(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/_group_aggregations`,
      validate: {
        body: buildRouteValidation(
          t.exact(
            t.interface({
              featureIds: t.array(t.string),
              groupByField: t.string,
              aggregations: alertsAggregationsSchema,
              filters: t.union([t.array(t.object), t.undefined]),
              sort: t.union([t.array(t.object), t.undefined]),
              pageIndex: t.union([t.number, t.undefined]),
              pageSize: t.union([t.number, t.undefined]),
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
        const { featureIds, groupByField, aggregations, filters, sort, pageIndex, pageSize } =
          request.body;
        const racContext = await context.rac;
        const alertsClient = await racContext.getAlertsClient();
        const alerts = await alertsClient.getGroupAggregations({
          featureIds,
          groupByField,
          aggregations,
          filters,
          sort,
          pageIndex,
          pageSize,
        });
        if (alerts == null) {
          return response.notFound({
            body: { message: `alerts not found` },
          });
        }
        return response.ok({
          body: alerts,
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
