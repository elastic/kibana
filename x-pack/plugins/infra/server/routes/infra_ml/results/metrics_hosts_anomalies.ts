/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { InfraBackendLibs } from '../../../lib/infra_types';
import {
  INFA_ML_GET_METRICS_HOSTS_ANOMALIES_PATH,
  getMetricsHostsAnomaliesSuccessReponsePayloadRT,
  getMetricsHostsAnomaliesRequestPayloadRT,
  GetMetricsHostsAnomaliesRequestPayload,
  Sort,
  Pagination,
} from '../../../../common/http_api/infra_ml';
import { createValidationFunction } from '../../../../common/runtime_types';
import { assertHasInfraMlPlugins } from '../../../utils/request_context';

import { isMlPrivilegesError } from '../../../lib/infra_ml/errors';
import { getMetricsHostsAnomalies } from '../../../lib/infra_ml';

export const initGetHostsAnomaliesRoute = ({ framework }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: INFA_ML_GET_METRICS_HOSTS_ANOMALIES_PATH,
      validate: {
        body: createValidationFunction(getMetricsHostsAnomaliesRequestPayloadRT),
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
          hostName,
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
        } = await getMetricsHostsAnomalies({
          context: await infraMlContext.infra,
          sourceId,
          anomalyThreshold,
          startTime,
          endTime,
          metric,
          query,
          sort,
          pagination,
          influencerFilter: hostName
            ? {
                fieldName: 'host.name',
                fieldValue: hostName,
              }
            : undefined,
        });

        return response.ok({
          body: getMetricsHostsAnomaliesSuccessReponsePayloadRT.encode({
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
  sort: Partial<GetMetricsHostsAnomaliesRequestPayload['data']['sort']> = {},
  pagination: Partial<GetMetricsHostsAnomaliesRequestPayload['data']['pagination']> = {}
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
