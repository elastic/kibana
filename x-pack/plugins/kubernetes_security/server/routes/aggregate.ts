/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SortCombinations } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { transformError } from '@kbn/securitysolution-es-utils';
import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient } from '@kbn/core/server';
import { IRouter, Logger } from '@kbn/core/server';
import {
  AGGREGATE_ROUTE,
  AGGREGATE_PAGE_SIZE,
  AGGREGATE_MAX_BUCKETS,
  ORCHESTRATOR_CLUSTER_ID,
  ORCHESTRATOR_RESOURCE_ID,
  ORCHESTRATOR_NAMESPACE,
  ORCHESTRATOR_CLUSTER_NAME,
  CONTAINER_IMAGE_NAME,
  CLOUD_INSTANCE_NAME,
  ENTRY_LEADER_ENTITY_ID,
  ENTRY_LEADER_USER_ID,
  ENTRY_LEADER_INTERACTIVE,
} from '../../common/constants';
import { AggregateBucketPaginationResult } from '../../common/types';

// sort by values
const ASC = 'asc';
const DESC = 'desc';

export const registerAggregateRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: AGGREGATE_ROUTE,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              index: schema.string(),
              query: schema.string(),
              countBy: schema.maybe(
                schema.oneOf([
                  schema.literal(ORCHESTRATOR_CLUSTER_ID),
                  schema.literal(ORCHESTRATOR_RESOURCE_ID),
                  schema.literal(ORCHESTRATOR_NAMESPACE),
                  schema.literal(ORCHESTRATOR_CLUSTER_NAME),
                  schema.literal(CLOUD_INSTANCE_NAME),
                  schema.literal(CONTAINER_IMAGE_NAME),
                  schema.literal(ENTRY_LEADER_ENTITY_ID),
                ])
              ),
              groupBy: schema.oneOf([
                schema.literal(ORCHESTRATOR_CLUSTER_ID),
                schema.literal(ORCHESTRATOR_RESOURCE_ID),
                schema.literal(ORCHESTRATOR_NAMESPACE),
                schema.literal(ORCHESTRATOR_CLUSTER_NAME),
                schema.literal(CLOUD_INSTANCE_NAME),
                schema.literal(CONTAINER_IMAGE_NAME),
                schema.literal(ENTRY_LEADER_USER_ID),
                schema.literal(ENTRY_LEADER_INTERACTIVE),
              ]),
              page: schema.number({ defaultValue: 0, max: 10000, min: 0 }),
              perPage: schema.maybe(schema.number({ defaultValue: 10, max: 100, min: 1 })),
              sortByCount: schema.maybe(schema.oneOf([schema.literal(ASC), schema.literal(DESC)])),
            }),
          },
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
          const error = transformError(err);
          logger.error(`Failed to fetch k8s aggregates: ${err}`);

          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
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
