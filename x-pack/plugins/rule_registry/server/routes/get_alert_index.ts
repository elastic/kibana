/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'kibana/server';
import { id as _id } from '@kbn/securitysolution-io-ts-list-types';
import { transformError } from '@kbn/securitysolution-es-utils';

import { RacRequestHandlerContext } from '../types';
import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';

export const getAlertsIndexRoute = (router: IRouter<RacRequestHandlerContext>) => {
  router.get(
    {
      path: `${BASE_RAC_ALERTS_API_PATH}/index`,
      validate: false,
      options: {
        tags: ['access:rac'],
      },
    },
    async (context, request, response) => {
      const APM_SERVER_FEATURE_ID = 'apm';
      const SERVER_APP_ID = 'siem';
      try {
        const alertsClient = await context.rac.getAlertsClient();
        const indexName = await alertsClient.getAuthorizedAlertsIndices([
          APM_SERVER_FEATURE_ID,
          SERVER_APP_ID,
        ]);
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

        return response.custom({
          headers: defaultedHeaders,
          statusCode: err.statusCode,
          body: Buffer.from(
            JSON.stringify({
              message: err.message,
              status_code: err.statusCode,
            })
          ),
        });
        // return response.custom;
      }
    }
  );
};
