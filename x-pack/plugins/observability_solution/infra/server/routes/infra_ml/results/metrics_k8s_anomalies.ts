/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { InfraBackendLibs } from '../../../lib/infra_types';
import {
  INFA_ML_GET_METRICS_K8S_ANOMALIES_PATH,
  getMetricsK8sAnomaliesSuccessReponsePayloadRT,
  getMetricsK8sAnomaliesRequestPayloadRT,
  GetMetricsK8sAnomaliesRequestPayload,
  Sort,
  Pagination,
} from '../../../../common/http_api/infra_ml';
import { createValidationFunction } from '../../../../common/runtime_types';
import { assertHasInfraMlPlugins } from '../../../utils/request_context';
import { getMetricK8sAnomalies } from '../../../lib/infra_ml';
import { isMlPrivilegesError } from '../../../lib/infra_ml/errors';

export const initGetK8sAnomaliesRoute = ({ framework }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: INFA_ML_GET_METRICS_K8S_ANOMALIES_PATH,
      validate: {
        body: createValidationFunction(getMetricsK8sAnomaliesRequestPayloadRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const {
        data: {
          sourceId,
          anomalyThreshold,
          timeRange: { startTime, endTime },
          sort: sortParam,
          pagination: paginationParam,
          metric,
          query,
        },
      } = request.body;

      const { sort, pagination } = getSortAndPagination(sortParam, paginationParam);

      try {
        const infraMlContext = await assertHasInfraMlPlugins(requestContext);

        const {
          data: anomalies,
          paginationCursors,
          hasMoreEntries,
          timing,
        } = await getMetricK8sAnomalies({
          context: await infraMlContext.infra,
          sourceId,
          anomalyThreshold,
          startTime,
          endTime,
          metric,
          query,
          sort,
          pagination,
        });

        return response.ok({
          body: getMetricsK8sAnomaliesSuccessReponsePayloadRT.encode({
            data: {
              anomalies,
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
  sort: Partial<GetMetricsK8sAnomaliesRequestPayload['data']['sort']> = {},
  pagination: Partial<GetMetricsK8sAnomaliesRequestPayload['data']['pagination']> = {}
): {
  sort: Sort;
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
