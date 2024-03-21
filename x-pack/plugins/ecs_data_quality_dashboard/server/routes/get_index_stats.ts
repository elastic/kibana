/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { IRouter, Logger } from '@kbn/core/server';

import type { IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';
import { fetchStats, fetchAvailableIndices } from '../lib';
import { buildResponse } from '../lib/build_response';
import { GET_INDEX_STATS, INTERNAL_API_VERSION } from '../../common/constants';
import { buildRouteValidation } from '../schemas/common';
import { GetIndexStatsParams, GetIndexStatsQuery } from '../schemas/get_index_stats';
import { API_DEFAULT_ERROR_MESSAGE } from '../translations';

export const getIndexStatsRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      path: GET_INDEX_STATS,
      access: 'internal',
      options: { tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidation(GetIndexStatsParams),
            query: buildRouteValidation(GetIndexStatsQuery),
          },
        },
      },
      async (context, request, response) => {
        const resp = buildResponse(response);

        try {
          const { client } = (await context.core).elasticsearch;
          const esClient = client.asCurrentUser;

          const decodedIndexName = decodeURIComponent(request.params.pattern);

          const stats = await fetchStats(client, decodedIndexName);
          const { isILMAvailable, startDate, endDate } = request.query;

          if (isILMAvailable === true) {
            return response.ok({
              body: stats.indices,
            });
          }

          /**
           * If ILM is not available, we need to fetch the available indices with the given date range.
           * `fetchAvailableIndices` returns indices that have data in the given date range.
           */
          if (startDate && endDate) {
            const decodedStartDate = decodeURIComponent(startDate);
            const decodedEndDate = decodeURIComponent(endDate);

            const indices = await fetchAvailableIndices(esClient, {
              indexPattern: decodedIndexName,
              startDate: decodedStartDate,
              endDate: decodedEndDate,
            });
            const availableIndices = indices?.aggregations?.index?.buckets?.reduce(
              (acc: Record<string, IndicesStatsIndicesStats>, { key }: { key: string }) => {
                if (stats.indices?.[key]) {
                  acc[key] = stats.indices?.[key];
                }
                return acc;
              },
              {}
            );

            return response.ok({
              body: availableIndices,
            });
          } else {
            return resp.error({
              body: i18n.translate(
                'xpack.ecsDataQualityDashboard.getIndexStats.dateRangeRequiredErrorMessage',
                {
                  defaultMessage: 'startDate and endDate are required',
                }
              ),
              statusCode: 400,
            });
          }
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
