/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'kibana/server';
import * as t from 'io-ts';
import { id as _id } from '@kbn/securitysolution-io-ts-list-types';
import { transformError } from '@kbn/securitysolution-es-utils';

import { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { buildRouteValidation } from './utils/route_validation';

export const getAlertByIdRoute = (router: IRouter<RacRequestHandlerContext>) => {
  router.get(
    {
      path: BASE_RAC_ALERTS_API_PATH,
      validate: {
        query: buildRouteValidation(
          t.intersection([
            t.exact(
              t.type({
                id: _id,
              })
            ),
            t.exact(
              t.partial({
                index: t.string,
              })
            ),
          ])
        ),
      },
      options: {
        tags: ['access:rac'],
      },
    },
    async (context, request, response) => {
      try {
        const racContext = await context.rac;
        const alertsClient = await racContext.getAlertsClient();
        const { id, index } = request.query;
        const alert = await alertsClient.get({ id, index });
        if (alert == null) {
          return response.notFound({
            body: { message: `alert with id ${id} and index ${index} not found` },
          });
        }
        return response.ok({
          body: alert,
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
