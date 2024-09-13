/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  QUERY_KEY_COUNT_WIDGET,
  COUNT_ROUTE,
  CURRENT_API_VERSION,
} from '../../../common/constants';

export const useFetchCountWidgetData = (
  widgetKey: string,
  filterQuery: string,
  groupedBy: string,
  index?: string
) => {
  const { http } = useKibana<CoreStart>().services;
  const cachingKeys = [QUERY_KEY_COUNT_WIDGET, widgetKey, filterQuery, groupedBy, index];

  const query = useInfiniteQuery(
    cachingKeys,
    async () => {
      const res = await http.get<number>(COUNT_ROUTE, {
        version: CURRENT_API_VERSION,
        query: {
          query: filterQuery,
          field: groupedBy,
          index,
        },
      });

      return res;
    },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  );

  return query;
};
