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
import { createDocumentFromResult } from './parser';
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
        // TODO: https://github.com/elastic/kibana/pull/173185#issuecomment-1908034302
        return response.ok({ body: { result: 'noop' } });

        // eslint-disable-next-line no-unreachable
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
          // Confirm user has authorization for the pattern payload
          const { pattern } = request.body.rollup;
          const userEsClient = services.core.elasticsearch.client.asCurrentUser;
          const privileges = await userEsClient.security.hasPrivileges({
            index: [{ names: [pattern], privileges: ['all', 'read', 'view_index_metadata'] }],
          });
          if (!privileges.has_all_requested) {
            return response.ok({ body: { result: 'noop' } });
          }

          // Index the result
          const document = createDocumentFromResult(request.body);
          const esClient = services.core.elasticsearch.client.asInternalUser;
          const outcome = await esClient.index({ index, body: document });

          return response.ok({ body: { result: outcome.result } });
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
