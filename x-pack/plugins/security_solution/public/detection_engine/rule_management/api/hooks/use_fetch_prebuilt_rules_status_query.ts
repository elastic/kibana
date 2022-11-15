/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPrePackagedRulesStatus } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import type { PrePackagedRulesStatusResponse } from '../../logic';
import { PREBUILT_RULES_STATUS_URL } from '../../../../../common/detection_engine/prebuilt_rules/api/urls';

export const PREBUILT_RULES_STATUS_QUERY_KEY = ['GET', PREBUILT_RULES_STATUS_URL];

export const useFetchPrebuiltRulesStatusQuery = (
  options?: UseQueryOptions<PrePackagedRulesStatusResponse>
) => {
  return useQuery<PrePackagedRulesStatusResponse>(
    PREBUILT_RULES_STATUS_QUERY_KEY,
    async ({ signal }) => {
      const response = await getPrePackagedRulesStatus({ signal });
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
export const useInvalidateFetchPrebuiltRulesStatusQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(PREBUILT_RULES_STATUS_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
