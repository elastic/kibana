/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { schema } from '@kbn/config-schema';

import { IndexPatternsFetcher } from '@kbn/data-plugin/server';
import { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';

export const getAlertFieldByFeatureId = (router: IRouter<RacRequestHandlerContext>) => {
  router.get(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/field_caps`,
      validate: {
        query: schema.object({
          featureIds: schema.string(),
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

        if (!indices) {
          throw new Error('fix me');
        }

        const o11yIndices = indices.filter((index) => index.startsWith('.alerts-observability'));
        const fieldCaps = alertsClient.getFieldCapabilities({ indices: o11yIndices });

        return response.ok({
          body: {
            featureIds,
            authAlertIndices: indices,
            o11yIndices,
            fieldCaps,
          },
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
