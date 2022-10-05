/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';

import { fetchMappings } from '../../lib/fetch_mappings';

export const defineRoutes = (router: IRouter) => {
  router.get(
    {
      path: '/internal/data_quality/mappings/{index_name}',
      validate: {
        params: schema.object({
          index_name: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const decodedIndexName = decodeURIComponent(request.params.index_name);

      const mappings = await fetchMappings(client, decodedIndexName);

      // TODO: error handling

      return response.ok({
        body: mappings,
      });
    }
  );
};
