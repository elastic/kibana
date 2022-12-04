/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RulesInfoResponse } from '../../../../../common/detection_engine/rule_management/api/rules/info/response_schema';
import { RULES_INFO_URL } from '../../../../../common/detection_engine/rule_management/api/urls';
import { fetchRulesInfo } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';

export const RULES_INFO_QUERY_KEY = ['GET', RULES_INFO_URL];

export const useFetchRulesInfoQuery = (options?: UseQueryOptions<RulesInfoResponse>) => {
  return useQuery<RulesInfoResponse>(
    RULES_INFO_QUERY_KEY,
    async ({ signal }) => {
      const response = await fetchRulesInfo({ signal });
      return response;
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
    }
  );
};

/**
 * We should use this hook to invalidate the prepackaged rules cache. For
 * example, rule mutations that affect rule set size, like creation or deletion,
 * should lead to cache invalidation.
 *
 * @returns A rules cache invalidation callback
 */
export const useInvalidateFetchRulesInfoQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(RULES_INFO_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
