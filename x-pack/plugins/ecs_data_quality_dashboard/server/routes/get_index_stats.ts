/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import { fetchStats } from '../lib';
import { buildResponse } from '../lib/build_response';
import { GET_INDEX_STATS } from '../../common/constants';
import { buildRouteValidation } from '../schemas/common';
import { GetIndexStatsParams } from '../schemas/get_index_stats';

export const getIndexStatsRoute = (router: IRouter) => {
  router.get(
    {
      path: GET_INDEX_STATS,
      validate: { params: buildRouteValidation(GetIndexStatsParams) },
    },
    async (context, request, response) => {
      const resp = buildResponse(response);

      try {
        const { client } = (await context.core).elasticsearch;
        const decodedIndexName = decodeURIComponent(request.params.pattern);

        const stats = await fetchStats(client, decodedIndexName);

        return response.ok({
          body: stats.indices,
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
