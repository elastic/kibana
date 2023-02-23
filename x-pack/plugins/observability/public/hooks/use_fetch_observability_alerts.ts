/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import { Rule } from '@kbn/alerting-plugin/common';

import { useKibana } from '../utils/kibana_react';

export interface UseFetchObservabilityAlertsResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  alerts: Rule[] | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<Rule[] | undefined, unknown>>;
}

interface FetchObservabilityAlertsResponse {
  data: Rule[];
}

const allowedConsumers = ['apm', 'uptime', 'logs', 'infrastructure', 'alerts'];

export function useFetchObservabilityAlerts(): UseFetchObservabilityAlertsResponse {
  const { http } = useKibana().services;

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: ['fetchObservabilityAlerts'],
    queryFn: async ({ signal }) => {
      try {
        const response = await http.get<FetchObservabilityAlertsResponse>('/api/alerts/_find', {
          query: {
            page: 1,
            per_page: 20,
          },
          signal,
        });

        const filteredData = response.data.filter(({ consumer }) =>
          allowedConsumers.includes(consumer)
        );

        return filteredData;
      } catch (e) {
        console.error('Error while fetching alerts', e);
      }
    },
  });

  return {
    isLoading,
    isError,
    isSuccess,
    alerts: data,
    refetch,
  };
}
