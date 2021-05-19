/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'kibana/server';
import * as t from 'io-ts';
import { id as _id } from '@kbn/securitysolution-io-ts-list-types';

import { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { buildRouteValidation } from './utils/route_validation';

export const getAlertByIdRoute = (router: IRouter<RacRequestHandlerContext>) => {
  router.get(
    {
      path: BASE_RAC_ALERTS_API_PATH,
      validate: {
        query: buildRouteValidation(
          t.exact(
            t.type({
              id: _id,
            })
          )
        ),
      },
      options: {
        tags: ['access:rac'],
      },
    },
    async (context, request, response) => {
      const alertsClient = await context.rac.getAlertsClient();
      const { id } = request.query;
      const alert = await alertsClient.get({ id });
      return response.ok({
        body: alert,
      });
    }
  );
};
