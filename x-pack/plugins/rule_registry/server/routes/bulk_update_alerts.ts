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

import { buildRouteValidation } from './utils/route_validation';
import { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';

export const bulkUpdateAlertsRoute = (router: IRouter<RacRequestHandlerContext>) => {
  router.post(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/bulk_update`,
      validate: {
        body: buildRouteValidation(
          t.union([
            t.strict({
              status: t.union([
                t.literal('open'),
                t.literal('closed'),
                t.literal('in-progress'), // TODO: remove after migration to acknowledged
                t.literal('acknowledged'),
              ]),
              index: t.string,
              ids: t.array(t.string),
              query: t.undefined,
            }),
            t.strict({
              status: t.union([
                t.literal('open'),
                t.literal('closed'),
                t.literal('in-progress'), // TODO: remove after migration to acknowledged
                t.literal('acknowledged'),
              ]),
              index: t.string,
              ids: t.undefined,
              query: t.union([t.object, t.string]),
            }),
          ])
        ),
      },
      options: {
        tags: ['access:rac'],
      },
    },
    async (context, req, response) => {
      try {
        const racContext = await context.rac;
        const alertsClient = await racContext.getAlertsClient();
        const { status, ids, index, query } = req.body;

        if (ids != null && ids.length > 1000) {
          return response.badRequest({
            body: {
              message: 'cannot use more than 1000 ids',
            },
          });
        }

        const updatedAlert = await alertsClient.bulkUpdate({
          ids,
          status,
          query,
          index,
        });

        if (updatedAlert == null) {
          return response.notFound({
            body: { message: `alerts with ids ${ids} and index ${index} not found` },
          });
        }

        return response.ok({ body: { success: true, ...updatedAlert } });
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
