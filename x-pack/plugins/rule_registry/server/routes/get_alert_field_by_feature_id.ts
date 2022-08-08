/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
// import { validFeatureIds } from '@kbn/rule-data-utils';
import { schema } from '@kbn/config-schema';

import { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';

export const getAlertFieldByFeatureId = (router: IRouter<RacRequestHandlerContext>) => {
  router.get(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/field_caps`,
      validate: {
        query: schema.object({
          featureId: schema.string(),
        }),
      },
      options: {
        /**
         * Additional metadata tag strings to attach to the route.
         */
        tags: ['access:rac'],
      },
    },
    async (context, request, response) => {
      try {
        const racContext = await context.rac;
        console.log('###################################################', racContext);
        const alertsClient = await racContext.getAlertsClient();
        const { featureId } = request.query;

        const alert = await alertsClient.get({ id, index });
        if (alert == null) {
          return response.notFound({
            body: { message: `no categories` },
          });
        }

        return response.ok({
          body: featureId,
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
