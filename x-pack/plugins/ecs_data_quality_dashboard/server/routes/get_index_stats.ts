/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { IRouter, Logger } from '@kbn/core/server';

import {
  fetchStats,
  fetchAvailableIndices,
  fetchMeteringStats,
  parseIndicesStats,
  parseMeteringStats,
  pickAvailableMeteringStats,
} from '../lib';
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

          const { isILMAvailable, startDate, endDate } = request.query;

          if (isILMAvailable === true) {
            const stats = await fetchStats(client, decodedIndexName);
            const parsedIndices = parseIndicesStats(stats.indices);

            return response.ok({
              body: parsedIndices,
            });
          }

          /**
           * If ILM is not available, we need to fetch the available indices with the given date range.
           * `fetchAvailableIndices` returns indices that have data in the given date range.
           */
          if (startDate && endDate) {
            const decodedStartDate = decodeURIComponent(startDate);
            const decodedEndDate = decodeURIComponent(endDate);
            const meteringStats = await fetchMeteringStats(
              client,
              decodedIndexName,
              request.headers.authorization
            );

            if (!meteringStats.indices) {
              logger.warn(`No metering stats indices found under pattern: ${decodedIndexName}`);
              return response.ok({
                body: {},
              });
            }

            const meteringStatsIndices = parseMeteringStats(meteringStats.indices);

            const availableIndices = await fetchAvailableIndices(esClient, {
              indexNameOrPattern: decodedIndexName,
              startDate: decodedStartDate,
              endDate: decodedEndDate,
            });

            if (availableIndices.length === 0) {
              logger.warn(
                `No available indices found under pattern: ${decodedIndexName}, in the given date range: ${decodedStartDate} - ${decodedEndDate}`
              );
              return response.ok({
                body: {},
              });
            }

            const indices = pickAvailableMeteringStats(availableIndices, meteringStatsIndices);

            return response.ok({
              body: indices,
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
