/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { transformError, buildResponse } from '@kbn/securitysolution-es-utils';

import { fetchStats } from '../lib';
import { GET_INDEX_STATS } from '../../common/constants';

export const getIndexStatsRoute = (router: IRouter) => {
  router.get(
    {
      path: GET_INDEX_STATS,
      validate: {
        params: schema.object({
          index_name: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const resp = buildResponse(response);

      try {
        const { client } = (await context.core).elasticsearch;
        const decodedIndexName = decodeURIComponent(request.params.index_name);

        const mappings = await fetchStats(client, decodedIndexName);

        return response.ok({
          body: mappings.indices,
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
