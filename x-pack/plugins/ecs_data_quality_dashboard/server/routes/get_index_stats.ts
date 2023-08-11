/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import { IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';
import { fetchStats } from '../lib';
import { buildResponse } from '../lib/build_response';
import { GET_INDEX_STATS } from '../../common/constants';
import { buildRouteValidation } from '../schemas/common';
import { GetIndexStatsParams, GetIndexStatsQuery } from '../schemas/get_index_stats';
import { fetchAvailableIndices } from '../lib/fetch_available_indices';

export const getIndexStatsRoute = (router: IRouter) => {
  router.get(
    {
      path: GET_INDEX_STATS,
      validate: {
        params: buildRouteValidation(GetIndexStatsParams),
        query: buildRouteValidation(GetIndexStatsQuery),
      },
    },
    async (context, request, response) => {
      const resp = buildResponse(response);

      try {
        const { client } = (await context.core).elasticsearch;
        const esClient = client.asCurrentUser;

        const decodedIndexName = decodeURIComponent(request.params.pattern);

        const stats = await fetchStats(client, decodedIndexName);

        if (request.query.isILMAvailable === true) {
          return response.ok({
            body: stats.indices,
          });
        }

        const indices = await fetchAvailableIndices(esClient, decodedIndexName);
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
      } catch (err) {
        const error = transformError(err);

        return resp.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
