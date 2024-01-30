/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';

import { RESULTS_ROUTE_PATH, INTERNAL_API_VERSION } from '../../../common/constants';
import { buildResponse } from '../../lib/build_response';
import { buildRouteValidation } from '../../schemas/common';
import { PostResultBody } from '../../schemas/result';
import { API_DEFAULT_ERROR_MESSAGE } from '../../translations';
import type { DataQualityDashboardRequestHandlerContext } from '../../types';
import { checkIndicesPrivileges } from './privileges';
import { API_RESULTS_INDEX_NOT_AVAILABLE } from './translations';

export const postResultsRoute = (
  router: IRouter<DataQualityDashboardRequestHandlerContext>,
  logger: Logger
) => {
  router.versioned
    .post({
      path: RESULTS_ROUTE_PATH,
      access: 'internal',
      options: { tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: { request: { body: buildRouteValidation(PostResultBody) } },
      },
      async (context, request, response) => {
        const services = await context.resolve(['core', 'dataQualityDashboard']);
        const resp = buildResponse(response);

        let index: string;
        try {
          index = await services.dataQualityDashboard.getResultsIndexName();
        } catch (err) {
          logger.error(`[POST result] Error retrieving results index name: ${err.message}`);
          return resp.error({
            body: `${API_RESULTS_INDEX_NOT_AVAILABLE}: ${err.message}`,
            statusCode: 503,
          });
        }

        try {
          const { client } = services.core.elasticsearch;

          // Confirm user has authorization for the indexName payload
          const { indexName } = request.body;
          const hadIndexPrivileges = await checkIndicesPrivileges({ client, indices: [indexName] });
          if (!hadIndexPrivileges[indexName]) {
            return response.ok({ body: { result: 'noop' } });
          }

          // Index the result
          const body = { '@timestamp': Date.now(), ...request.body };
          const outcome = await client.asInternalUser.index({ index, body });

          return response.ok({ body: { result: outcome.result } });
        } catch (err) {
          logger.error(err.message);

          return resp.error({
            body: err.message ?? API_DEFAULT_ERROR_MESSAGE,
            statusCode: err.statusCode ?? 500,
          });
        }
      }
    );
};
