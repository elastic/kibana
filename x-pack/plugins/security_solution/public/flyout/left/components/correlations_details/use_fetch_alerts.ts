/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/public';
import { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { SearchHit } from '@kbn/es-types';
import { useKibana } from '../../../../common/lib/kibana';

export interface UseAlertsQueryParams {
  alertIds: string[];
  from: number;
  size: number;
  sort?: Array<Record<string, 'asc' | 'desc'>>;
}

export interface UseAlertsQueryResult {
  error: boolean;
  loading: boolean;
  totalItemCount: number;
  // TODO: fix this type
  data: any;
}
/**
 * Returns alerts based on provided ids with support for pagination. Uses react-query internally.
 */

export const useFetchAlerts = ({
  alertIds,
  from,
  size,
  sort,
}: UseAlertsQueryParams): UseAlertsQueryResult => {
  const QUERY_KEY = `useFetchAlerts`;

  const {
    services: { data: dataService },
  } = useKibana();

  const { data, isLoading, isError } = useQuery<
    SearchResponse<SearchHit, Record<string, AggregationsAggregate>>,
    unknown
  >(
    [QUERY_KEY, alertIds, from, size, sort],
    async ({ signal }) => {
      return new Promise((resolve, reject) => {
        const $subscription = dataService.search
          .search(
            {
              params: {
                body: {
                  query: {
                    ids: { values: alertIds },
                  },
                  from,
                  size,
                  sort,
                  fields: ['*'],
                  _source: false,
                },
              },
            },
            { abortSignal: signal }
          )
          .subscribe((response) => {
            if (isCompleteResponse(response)) {
              $subscription.unsubscribe();
              resolve(response.rawResponse);
            } else if (isErrorResponse(response)) {
              $subscription.unsubscribe();
              reject(new Error(`Error while loading alerts`));
            }
          });
      });
    },
    {
      keepPreviousData: true,
    }
  );

  return useMemo(
    () => ({
      loading: isLoading,
      error: isError,
      data: data?.hits?.hits || [],
      totalItemCount: (data?.hits?.total as number) || 0,
    }),
    [data, isError, isLoading]
  );
};
