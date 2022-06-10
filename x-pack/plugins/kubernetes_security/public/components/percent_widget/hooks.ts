/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { CoreStart } from '@kbn/core/server';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QUERY_KEY_PERCENT_WIDGET, AGGREGATE_ROUTE } from '../../../common/constants';
import { AggregateResults } from '../../../common/types/aggregate';

export const useFetchPercentWidgetData = (
  filterQuery: string,
  widgetKey: string,
  groupBy: string,
  countBy?: string,
  index?: string
) => {
  const { http } = useKibana<CoreStart>().services;
  const cachingKeys = [QUERY_KEY_PERCENT_WIDGET, widgetKey, filterQuery, groupBy, countBy];
  const query = useQuery(
    cachingKeys,
    async () => {
      const res = await http.get<AggregateResults[]>(AGGREGATE_ROUTE, {
        query: {
          query: filterQuery,
          groupBy,
          countBy,
          page: 0,
          index,
        },
      });

      const data = res.reduce((groupedByKeyValue, { key, key_as_string, count_by_aggs }) => {
        groupedByKeyValue[key_as_string || (key.toString() as string)] = count_by_aggs.value;
        return groupedByKeyValue;
      }, {} as Record<string, number>);

      return data;
    },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  );

  return query;
};
