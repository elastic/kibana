/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import { logAnalysisResultsV1 } from '../../../../common/http_api';
import { InfraBackendLibs } from '../../../lib/infra_types';

import { AnomaliesSort, Pagination } from '../../../../common/log_analysis';
import { assertHasInfraMlPlugins } from '../../../utils/request_context';
import { getLogEntryAnomalies } from '../../../lib/log_analysis';
import { isMlPrivilegesError } from '../../../lib/log_analysis/errors';

export const initGetLogEntryAnomaliesRoute = ({ framework }: InfraBackendLibs) => {
  if (!framework.config.featureFlags.logsUIEnabled) {
    return;
  }
  framework
    .registerVersionedRoute({
      access: 'internal',
      method: 'post',
      path: logAnalysisResultsV1.LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: createRouteValidationFunction(
              logAnalysisResultsV1.getLogEntryAnomaliesRequestPayloadRT
            ),
          },
        },
      },
      framework.router.handleLegacyErrors(async (requestContext, request, response) => {
        const {
          data: {
            logView,
            idFormats,
            timeRange: { startTime, endTime },
            sort: sortParam,
            pagination: paginationParam,
            datasets,
          },
        } = request.body;

        const { sort, pagination } = getSortAndPagination(sortParam, paginationParam);

        try {
          const infraMlContext = await assertHasInfraMlPlugins(requestContext);

          const {
            data: logEntryAnomalies,
            paginationCursors,
            hasMoreEntries,
            timing,
          } = await getLogEntryAnomalies(
            infraMlContext,
            logView,
            idFormats,
            startTime,
            endTime,
            sort,
            pagination,
            datasets
          );

          return response.ok({
            body: logAnalysisResultsV1.getLogEntryAnomaliesSuccessReponsePayloadRT.encode({
              data: {
                anomalies: logEntryAnomalies,
                hasMoreEntries,
                paginationCursors,
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

const getSortAndPagination = (
  sort: Partial<logAnalysisResultsV1.GetLogEntryAnomaliesRequestPayload['data']['sort']> = {},
  pagination: Partial<
    logAnalysisResultsV1.GetLogEntryAnomaliesRequestPayload['data']['pagination']
  > = {}
): {
  sort: AnomaliesSort;
  pagination: Pagination;
} => {
  const sortDefaults = {
    field: 'anomalyScore' as const,
    direction: 'desc' as const,
  };

  const sortWithDefaults = {
    ...sortDefaults,
    ...sort,
  };

  const paginationDefaults = {
    pageSize: 50,
  };

  const paginationWithDefaults = {
    ...paginationDefaults,
    ...pagination,
  };

  return { sort: sortWithDefaults, pagination: paginationWithDefaults };
};
