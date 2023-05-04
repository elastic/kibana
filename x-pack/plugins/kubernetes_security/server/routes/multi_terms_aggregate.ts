/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient } from '@kbn/core/server';
import { IRouter } from '@kbn/core/server';
import { MULTI_TERMS_AGGREGATE_ROUTE, AGGREGATE_PAGE_SIZE } from '../../common/constants';
import {
  MultiTermsAggregateGroupBy,
  MultiTermsAggregateBucketPaginationResult,
} from '../../common/types/multi_terms_aggregate';

export const registerMultiTermsAggregateRoute = (router: IRouter) => {
  router.get(
    {
      path: MULTI_TERMS_AGGREGATE_ROUTE,
      validate: {
        query: schema.object({
          index: schema.string(),
          query: schema.string(),
          countBy: schema.maybe(schema.string()),
          groupBys: schema.arrayOf(
            schema.object({
              field: schema.string(),
              missing: schema.maybe(schema.string()),
            }),
            { defaultValue: [] }
          ),
          page: schema.number(),
          perPage: schema.maybe(schema.number()),
        }),
      },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const { query, countBy, groupBys, page, perPage, index } = request.query;

      try {
        const body = await doSearch(client, index, query, groupBys, page, perPage, countBy);

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
  groupBys: MultiTermsAggregateGroupBy[],
  page: number, // zero based
  perPage = AGGREGATE_PAGE_SIZE,
  countBy?: string
): Promise<MultiTermsAggregateBucketPaginationResult> => {
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

  const search = await client.search({
    index: [index],
    body: {
      query: queryDSL,
      size: 0,
      aggs: {
        custom_agg: {
          multi_terms: {
            terms: groupBys,
          },
          aggs: {
            ...countByAggs,
            bucket_sort: {
              bucket_sort: {
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
