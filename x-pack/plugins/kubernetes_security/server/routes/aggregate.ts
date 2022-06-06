/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient } from '@kbn/core/server';
import { IRouter } from '@kbn/core/server';
import { PROCESS_EVENTS_INDEX } from '@kbn/session-view-plugin/common/constants';
import {
  AGGREGATE_ROUTE,
  AGGREGATE_PAGE_SIZE,
  AGGREGATE_MAX_BUCKETS,
} from '../../common/constants';

export const registerAggregateRoute = (router: IRouter) => {
  router.get(
    {
      path: AGGREGATE_ROUTE,
      validate: {
        query: schema.object({
          query: schema.string(),
          groupBy: schema.string(),
          page: schema.number(),
          index: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const { query, groupBy, page, index } = request.query;

      try {
        const body = await doSearch(client, query, groupBy, page, index);

        return response.ok({ body });
      } catch (err) {
        return response.badRequest(err.message);
      }
    }
  );
};

export const doSearch = async (
  client: ElasticsearchClient,
  query: string,
  groupBy: string,
  page: number, // zero based
  index?: string
) => {
  const queryDSL = JSON.parse(query);

  const search = await client.search({
    index: [index || PROCESS_EVENTS_INDEX],
    body: {
      query: queryDSL,
      size: 0,
      aggs: {
        custom_agg: {
          terms: {
            field: groupBy,
            size: AGGREGATE_MAX_BUCKETS,
          },
          aggs: {
            bucket_sort: {
              bucket_sort: {
                sort: [{ _key: { order: 'asc' } }], // defaulting to alphabetic sort
                size: AGGREGATE_PAGE_SIZE,
                from: AGGREGATE_PAGE_SIZE * page,
              },
            },
          },
        },
      },
    },
  });

  const agg: any = search.aggregations?.custom_agg;

  return agg?.buckets || [];
};
