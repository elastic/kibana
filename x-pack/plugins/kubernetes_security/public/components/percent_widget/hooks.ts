/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QUERY_KEY_PERCENT_WIDGET, AGGREGATE_ROUTE } from '../../../common/constants';
import { AggregateResult } from '../../../common/types/aggregate';

export const useFetchPercentWidgetData = (
  onReduce: (result: AggregateResult) => Record<string, number>,
  filterQuery: string,
  widgetKey: string,
  groupBy: string,
  countBy?: string,
  index?: string
) => {
  const { http } = useKibana<CoreStart>().services;
  const cachingKeys = [QUERY_KEY_PERCENT_WIDGET, widgetKey, filterQuery, groupBy, countBy, index];
  const query = useQuery(cachingKeys, async (): Promise<Record<string, number>> => {
    const res = await http.get<AggregateResult>(AGGREGATE_ROUTE, {
      query: {
        query: filterQuery,
        groupBy,
        countBy,
        page: 0,
        index,
      },
    });

    return onReduce(res);
  });

  return query;
};
