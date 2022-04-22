/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import * as t from 'io-ts';
import { id as _id } from '@kbn/securitysolution-io-ts-list-types';
import { transformError } from '@kbn/securitysolution-es-utils';
import { PositiveInteger } from '@kbn/securitysolution-io-ts-types';

import { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { buildRouteValidation } from './utils/route_validation';
import { BucketAggsSchemas } from '../../common/types';

export const findAlertsByQueryRoute = (router: IRouter<RacRequestHandlerContext>) => {
  router.post(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/find`,
      validate: {
        body: buildRouteValidation(
          t.exact(
            t.partial({
              index: t.string,
              query: t.object,
              aggs: t.union([t.record(t.string, BucketAggsSchemas), t.undefined]),
              size: t.union([PositiveInteger, t.undefined]),
              track_total_hits: t.union([t.boolean, t.undefined]),
              _source: t.union([t.array(t.string), t.undefined]),
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
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { query, aggs, _source, track_total_hits, size, index } = request.body;

        const racContext = await context.rac;
        const alertsClient = await racContext.getAlertsClient();

        const alerts = await alertsClient.find({
          query,
          aggs,
          _source,
          track_total_hits,
          size,
          index,
        });
        if (alerts == null) {
          return response.notFound({
            body: { message: `alerts with query and index ${index} not found` },
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
