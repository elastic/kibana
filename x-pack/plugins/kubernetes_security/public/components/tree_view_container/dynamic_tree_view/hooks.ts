/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useInfiniteQuery } from '@tanstack/react-query';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryDslQueryContainerBool } from '../../../types';
import {
  QUERY_KEY_PROCESS_EVENTS,
  AGGREGATE_ROUTE,
  MULTI_TERMS_AGGREGATE_ROUTE,
  ORCHESTRATOR_CLUSTER_NAME,
} from '../../../../common/constants';
import { AggregateBucketPaginationResult } from '../../../../common/types/aggregate';
import { Bucket } from '../../../../common/types/multi_terms_aggregate';
import { KUBERNETES_COLLECTION_FIELDS } from '../helpers';

export const useFetchDynamicTreeView = (
  query: QueryDslQueryContainerBool,
  groupBy: string,
  index?: string,
  enabled?: boolean
) => {
  const { http } = useKibana<CoreStart>().services;
  const cachingKeys = [QUERY_KEY_PROCESS_EVENTS, query, groupBy, index];

  return useInfiniteQuery<AggregateBucketPaginationResult>(
    cachingKeys,
    async ({ pageParam = 0 }) => {
      if (groupBy === KUBERNETES_COLLECTION_FIELDS.clusterId) {
        const { buckets } = await http.get<any>(MULTI_TERMS_AGGREGATE_ROUTE, {
          query: {
            query: JSON.stringify(query),
            groupBys: JSON.stringify([
              {
                field: groupBy,
              },
              {
                field: ORCHESTRATOR_CLUSTER_NAME,
                missing: '',
              },
            ]),
            page: pageParam,
            perPage: 50,
            index,
          },
        });

        return {
          buckets: buckets.map((bucket: Bucket) => ({
            ...bucket,
            key_as_string: bucket.key[1],
            key: bucket.key[0],
          })),
        };
      }

      return await http.get<any>(AGGREGATE_ROUTE, {
        query: {
          query: JSON.stringify(query),
          groupBy,
          page: pageParam,
          perPage: 50,
          index,
        },
      });
    },
    {
      enabled,
      getNextPageParam: (lastPage, pages) => (lastPage.hasNextPage ? pages.length : undefined),
    }
  );
};
