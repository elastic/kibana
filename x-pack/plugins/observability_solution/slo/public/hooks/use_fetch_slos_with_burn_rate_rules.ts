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
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import { HttpSetup } from '@kbn/core/public';
import { useKibana } from '../utils/kibana_react';
import { sloKeys } from './query_key_factory';
import { WindowSchema } from '../typings';

export interface SloRule extends Record<string, unknown> {
  windows: WindowSchema[];
}

interface RuleApiResponse {
  page: number;
  total: number;
  per_page: number;
  data: Array<Rule<SloRule>>;
}

export interface UseFetchSLOsWithBurnRateRuleParams {
  search?: string;
}

export interface UseFetchSLOsWithBurnRateRulesResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: Array<Rule<SloRule>> | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<Array<Rule<SloRule>> | undefined, unknown>>;
}

async function fetchRules({
  search,
  http,
  signal,
}: {
  search?: string;
  http: HttpSetup;
  signal?: AbortSignal;
}) {
  const filter = 'alert.attributes.alertTypeId:slo.rules.burnRate';

  const query = {
    search,
    filter,
    fields: ['id', 'params.windows', 'name'],
    per_page: 1000,
  };

  const response = await http.get<RuleApiResponse>(`${BASE_ALERTING_API_PATH}/rules/_find`, {
    query,
    signal,
  });

  return response.data;
}

export function useFetchSLOsWithBurnRateRules({
  search = '',
}: UseFetchSLOsWithBurnRateRuleParams): UseFetchSLOsWithBurnRateRulesResponse {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: sloKeys.burnRateRules(search),
      queryFn: async ({ signal }) => {
        try {
          return fetchRules({ search, http, signal });
        } catch (error) {
          // ignore error for retrieving slos
        }
      },
      refetchOnWindowFocus: false,
      keepPreviousData: true,
    }
  );

  return {
    data,
    isLoading,
    isInitialLoading,
    isRefetching,
    isSuccess,
    isError,
    refetch,
  };
}
