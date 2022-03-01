/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, QueryClient } from 'react-query';

import { fetchRules } from '../../../../../containers/detection_engine/rules/api';
import type { FilterOptions } from '../../../../../containers/detection_engine/rules/types';

const CUSTOM_RULES_COUNT_QUERY_KEY = 'customRulesCount';
interface CustomRulesCountData {
  customRulesCount: number;
}

export const getCustomRulesCountFromCache = (queryClient: QueryClient) =>
  queryClient.getQueryData<CustomRulesCountData>(CUSTOM_RULES_COUNT_QUERY_KEY)?.customRulesCount ??
  0;

type UseCustomRulesCount = (arg: { filterOptions: FilterOptions; enabled: boolean }) => {
  customRulesCount: number;
  isCustomRulesCountLoading: boolean;
};

export const useCustomRulesCount: UseCustomRulesCount = ({ filterOptions, enabled }) => {
  const { data, isFetching } = useQuery<CustomRulesCountData>(
    [CUSTOM_RULES_COUNT_QUERY_KEY],
    async ({ signal }) => {
      const res = await fetchRules({
        pagination: { perPage: 1, page: 1 },
        filterOptions: { ...filterOptions, showCustomRules: true },
        signal,
      });

      return {
        customRulesCount: res.total,
      };
    },
    {
      enabled,
    }
  );

  return {
    customRulesCount: data?.customRulesCount ?? 0,
    isCustomRulesCountLoading: isFetching,
  };
};
