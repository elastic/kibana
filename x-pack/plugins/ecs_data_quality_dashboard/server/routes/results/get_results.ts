/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';

import { RESULTS_ROUTE_PATH, INTERNAL_API_VERSION } from '../../../common/constants';
import { buildResponse } from '../../lib/build_response';
import { API_DEFAULT_ERROR_MESSAGE } from '../../translations';
import type { DataQualityDashboardRequestHandlerContext } from '../../types';
import { createResultFromDocument } from './parser';

export const getResultsRoute = (
  router: IRouter<DataQualityDashboardRequestHandlerContext>,
  logger: Logger
) => {
  router.versioned
    .get({
      path: RESULTS_ROUTE_PATH,
      access: 'internal',
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          // request: {
          //   params: buildRouteValidation({}),
          // },
          // response: buildRouteValidation(ResultBody),
        },
      },
      async (context, request, response) => {
        const { dataQualityDashboard } = await context.resolve(['core', 'dataQualityDashboard']);
        const { getResultsIndexName } = dataQualityDashboard;

        const resp = buildResponse(response);

        try {
          const index = await getResultsIndexName();
          const esClient = (await context.core).elasticsearch.client.asInternalUser;
          const outcome = await esClient.search({
            index,
            query: {},
          });

          return response.ok({ body: { result: createResultFromDocument(outcome) } });
          // return response.ok({ body: [] });
        } catch (err) {
          logger.error(JSON.stringify(err));

          return resp.error({
            body: err.message ?? API_DEFAULT_ERROR_MESSAGE,
            statusCode: err.statusCode ?? 500,
          });
        }
      }
    );
};
