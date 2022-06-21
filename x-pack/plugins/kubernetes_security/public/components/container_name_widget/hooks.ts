/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QUERY_KEY_CONTAINER_NAME_WIDGET, AGGREGATE_ROUTE } from '../../../common/constants';
import { AggregateResult } from '../../../common/types/aggregate';

export const useFetchContainerNameData = (
  onReduce: (result: AggregateResult[]) => Record<string, number>,
  filterQuery: string,
  widgetKey: string,
  groupBy: string,
  countBy?: string,
  index?: string,
  sortByCount?: string
) => {
  const { http } = useKibana<CoreStart>().services;
  const cachingKeys = [
    QUERY_KEY_CONTAINER_NAME_WIDGET,
    widgetKey,
    filterQuery,
    groupBy,
    countBy,
    sortByCount,
  ];
  const query = useQuery(
    cachingKeys,
    async () => {
      const res = await http.get<AggregateResult[]>(AGGREGATE_ROUTE, {
        query: {
          query: filterQuery,
          groupBy,
          countBy,
          page: 0,
          index,
          sortByCount,
        },
      });
      return onReduce(res);
    },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  );

  return query;
};
