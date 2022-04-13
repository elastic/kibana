/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  getLatestLogEntryCategoryDatasetsStatsRequestPayloadRT,
  getLatestLogEntryCategoryDatasetsStatsSuccessResponsePayloadRT,
  LOG_ANALYSIS_GET_LATEST_LOG_ENTRY_CATEGORY_DATASETS_STATS_PATH,
} from '../../../../common/http_api/log_analysis';
import { createValidationFunction } from '../../../../common/runtime_types';
import type { InfraBackendLibs } from '../../../lib/infra_types';
import { getLatestLogEntriesCategoriesDatasetsStats } from '../../../lib/log_analysis';
import { isMlPrivilegesError } from '../../../lib/log_analysis/errors';
import { assertHasInfraMlPlugins } from '../../../utils/request_context';

export const initGetLogEntryCategoryDatasetsStatsRoute = ({ framework }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ANALYSIS_GET_LATEST_LOG_ENTRY_CATEGORY_DATASETS_STATS_PATH,
      validate: {
        body: createValidationFunction(getLatestLogEntryCategoryDatasetsStatsRequestPayloadRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const {
        data: {
          jobIds,
          timeRange: { startTime, endTime },
          includeCategorizerStatuses,
        },
      } = request.body;

      try {
        const infraMlContext = await assertHasInfraMlPlugins(requestContext);

        const { data: datasetStats, timing } = await getLatestLogEntriesCategoriesDatasetsStats(
          { infra: await infraMlContext.infra },
          jobIds,
          startTime,
          endTime,
          includeCategorizerStatuses
        );

        return response.ok({
          body: getLatestLogEntryCategoryDatasetsStatsSuccessResponsePayloadRT.encode({
            data: {
              datasetStats,
            },
            timing,
          }),
        });
      } catch (error) {
        if (Boom.isBoom(error)) {
          throw error;
        }

        if (isMlPrivilegesError(error)) {
          return response.customError({
            statusCode: 403,
            body: {
              message: error.message,
            },
          });
        }

        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: {
            message: error.message ?? 'An unexpected error occurred',
          },
        });
      }
    })
  );
};
