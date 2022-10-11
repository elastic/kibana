/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QUERY_KEY_CONTAINER_NAME_WIDGET, AGGREGATE_ROUTE } from '../../../common/constants';
import { AggregateResult } from '../../../common/types/aggregate';

export const useFetchContainerNameData = (
  filterQuery: string,
  widgetKey: string,
  groupBy: string,
  countBy?: string,
  index?: string,
  sortByCount?: string,
  pageNumber?: number
) => {
  const { http } = useKibana<CoreStart>().services;
  const cachingKeys = [
    QUERY_KEY_CONTAINER_NAME_WIDGET,
    widgetKey,
    filterQuery,
    groupBy,
    countBy,
    sortByCount,
    pageNumber,
  ];
  const query = useInfiniteQuery(
    cachingKeys,
    async ({ pageParam = 0 }) => {
      const res = await http.get<AggregateResult>(AGGREGATE_ROUTE, {
        query: {
          query: filterQuery,
          groupBy,
          countBy,
          page: pageParam,
          index,
          sortByCount,
        },
      });
      return res;
    },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      getNextPageParam: (lastPage, pages) => (lastPage.hasNextPage ? pages.length : undefined),
    }
  );
  return query;
};
