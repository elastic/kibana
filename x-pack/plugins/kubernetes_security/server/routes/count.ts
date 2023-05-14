/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient } from '@kbn/core/server';
import { IRouter } from '@kbn/core/server';
import { COUNT_ROUTE } from '../../common/constants';

export const registerCountRoute = (router: IRouter) => {
  router.get(
    {
      path: COUNT_ROUTE,
      validate: {
        query: schema.object({
          index: schema.string(),
          query: schema.string(),
          field: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const { query, field, index } = request.query;

      try {
        const body = await doCount(client, index, query, field);

        return response.ok({ body });
      } catch (err) {
        return response.badRequest(err.message);
      }
    }
  );
};

export const doCount = async (
  client: ElasticsearchClient,
  index: string,
  query: string,
  field: string
) => {
  const queryDSL = JSON.parse(query);

  const search = await client.search({
    index: [index],
    body: {
      query: queryDSL,
      size: 0,
      aggs: {
        custom_count: {
          cardinality: {
            field,
          },
        },
      },
    },
  });

  const agg: any = search.aggregations?.custom_count;

  return agg?.value || 0;
};
