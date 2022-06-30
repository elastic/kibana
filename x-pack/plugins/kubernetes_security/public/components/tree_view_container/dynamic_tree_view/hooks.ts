/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useInfiniteQuery } from 'react-query';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryDslQueryContainerBool } from '../../../types';
import { QUERY_KEY_PROCESS_EVENTS, AGGREGATE_ROUTE } from '../../../../common/constants';
import { AggregateBucketPaginationResult } from '../../../../common/types/aggregate';

export const useFetchDynamicTreeView = (
  query: QueryDslQueryContainerBool,
  groupBy: string,
  index?: string
) => {
  const { http } = useKibana<CoreStart>().services;
  const cachingKeys = [QUERY_KEY_PROCESS_EVENTS, query, groupBy, index];

  return useInfiniteQuery<AggregateBucketPaginationResult>(
    cachingKeys,
    async ({ pageParam = 0 }) =>
      await http.get<any>(AGGREGATE_ROUTE, {
        query: {
          query: JSON.stringify(query),
          groupBy,
          page: pageParam,
          perPage: 50,
          index,
        },
      }),
    {
      getNextPageParam: (lastPage, pages) => (lastPage.hasNextPage ? pages.length : undefined),
    }
  );
};
