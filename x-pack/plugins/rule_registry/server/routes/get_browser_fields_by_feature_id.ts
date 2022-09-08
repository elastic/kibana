/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { schema } from '@kbn/config-schema';

import { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';

export const getBrowserFieldsByFeatureId = (router: IRouter<RacRequestHandlerContext>) => {
  router.get(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/browser_fields`,
      validate: {
        query: schema.object({
          featureIds: schema.string({ minLength: 1 }),
        }),
      },
      options: {
        tags: ['access:rac'],
      },
    },
    async (context, request, response) => {
      try {
        const racContext = await context.rac;
        const alertsClient = await racContext.getAlertsClient();

        const { featureIds } = request.query;
        const indices = await alertsClient.getAuthorizedAlertsIndices(featureIds.split(','));

        if (!indices || indices.length === 0) {
          return response.notFound({
            body: {
              message: `No indices found for featureIds [${featureIds}]`,
              attributes: { success: false },
            },
          });
        }

        const o11yIndices = indices.filter((index) => index.startsWith('.alerts-observability'));

        if (o11yIndices.length === 0) {
          return response.notFound({
            body: {
              message: `No alerts-observability indices found for featureIds [${featureIds}]`,
              attributes: { success: false },
            },
          });
        }

        const browserFields = await alertsClient.getBrowserFields({
          indices: o11yIndices,
          metaFields: ['_id', '_index'],
          allowNoIndex: true,
        });

        return response.ok({
          body: browserFields,
        });
      } catch (error) {
        const formatedError = transformError(error);
        const contentType = {
          'content-type': 'application/json',
        };
        const defaultedHeaders = {
          ...contentType,
        };

        return response.customError({
          headers: defaultedHeaders,
          statusCode: formatedError.statusCode,
          body: {
            message: formatedError.message,
            attributes: {
              success: false,
            },
          },
        });
      }
    }
  );
};
