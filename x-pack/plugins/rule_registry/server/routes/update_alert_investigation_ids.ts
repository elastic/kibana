/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import * as t from 'io-ts';
import { transformError } from '@kbn/securitysolution-es-utils';

import { buildRouteValidation } from './utils/route_validation';
import { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';

export const updateAlertInvestigationIdsRoute = (router: IRouter<RacRequestHandlerContext>) => {
  router.post(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/_update_investigaion_ids`,
      validate: {
        body: buildRouteValidation(
          t.exact(
            t.type({
              investigationIds: t.array(t.string),
              alertUuid: t.string,
              index: t.string,
            })
          )
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
        const { investigationIds, alertUuid, index } = req.body;

        const updatedAlert = await alertsClient.updateInvestigationIds({
          alert: { id: alertUuid, index },
          investigationIds,
        });

        if (updatedAlert == null) {
          return response.notFound({
            body: { message: `alert with id ${alertUuid} and index ${index} not found` },
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
