/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SortCombinations } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient } from '@kbn/core/server';
import { IRouter } from '@kbn/core/server';
import {
  AGGREGATE_ROUTE,
  AGGREGATE_PAGE_SIZE,
  AGGREGATE_MAX_BUCKETS,
} from '../../common/constants';
import { AggregateBucketPaginationResult } from '../../common/types/aggregate';

// sort by values
const ASC = 'asc';
const DESC = 'desc';

export const registerAggregateRoute = (router: IRouter) => {
  router.get(
    {
      path: AGGREGATE_ROUTE,
      validate: {
        query: schema.object({
          index: schema.string(),
          query: schema.string(),
          countBy: schema.maybe(schema.string()),
          groupBy: schema.string(),
          page: schema.number(),
          perPage: schema.maybe(schema.number()),
          sortByCount: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const { query, countBy, sortByCount, groupBy, page, perPage, index } = request.query;

      try {
        const body = await doSearch(
          client,
          index,
          query,
          groupBy,
          page,
          perPage,
          countBy,
          sortByCount
        );

        return response.ok({ body });
      } catch (err) {
        return response.badRequest(err.message);
      }
    }
  );
};

export const doSearch = async (
  client: ElasticsearchClient,
  index: string,
  query: string,
  groupBy: string,
  page: number, // zero based
  perPage = AGGREGATE_PAGE_SIZE,
  countBy?: string,
  sortByCount?: string
): Promise<AggregateBucketPaginationResult> => {
  const queryDSL = JSON.parse(query);

  const countByAggs = countBy
    ? {
        count_by_aggs: {
          cardinality: {
            field: countBy,
          },
        },
      }
    : undefined;

  let sort: SortCombinations = { _key: { order: ASC } };
  if (sortByCount === ASC || sortByCount === DESC) {
    sort = { 'count_by_aggs.value': { order: sortByCount } };
  }

  const search = await client.search({
    index: [index],
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
            ...countByAggs,
            bucket_sort: {
              bucket_sort: {
                sort: [sort], // defaulting to alphabetic sort
                size: perPage + 1, // check if there's a "next page"
                from: perPage * page,
              },
            },
          },
        },
      },
    },
  });

  const agg: any = search.aggregations?.custom_agg;
  const buckets = agg?.buckets || [];

  const hasNextPage = buckets.length > perPage;

  if (hasNextPage) {
    buckets.pop();
  }

  return {
    buckets,
    hasNextPage,
  };
};
