/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PrebuiltRulesStatusStats } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { getPrebuiltRulesStatus } from '../../api';
import { DEFAULT_QUERY_OPTIONS } from '../constants';
import { GET_PREBUILT_RULES_STATUS_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';

export const PREBUILT_RULES_STATUS_QUERY_KEY = ['GET', GET_PREBUILT_RULES_STATUS_URL];

export const useFetchPrebuiltRulesStatusQuery = (
  options?: UseQueryOptions<PrebuiltRulesStatusStats>
) => {
  return useQuery<PrebuiltRulesStatusStats>(
    PREBUILT_RULES_STATUS_QUERY_KEY,
    async ({ signal }) => {
      const response = await getPrebuiltRulesStatus({ signal });
      return response.stats;
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
    }
  );
};

/**
 * We should use this hook to invalidate the prepackaged rules cache. For
 * example, rule mutations that affect rule set size, like creation, deletion,
 * or installing and updating (which affect the stats) should lead to cache invalidation.
 *
 * @returns A rules cache invalidation callback
 */
export const useInvalidateFetchPrebuiltRulesStatusQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(PREBUILT_RULES_STATUS_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
