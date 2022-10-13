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

export interface PrebuiltRulesStatusResponse {
  rulesCustomInstalled: number;
  rulesInstalled: number;
  rulesNotInstalled: number;
  rulesNotUpdated: number;
  timelinesInstalled: number;
  timelinesNotInstalled: number;
  timelinesNotUpdated: number;
}

export const PREBUILT_RULES_STATUS_QUERY_KEY = 'prePackagedRulesStatus';

export const usePrebuiltRulesStatusQuery = (
  options: UseQueryOptions<PrebuiltRulesStatusResponse>
) => {
  return useQuery<PrebuiltRulesStatusResponse>(
    [PREBUILT_RULES_STATUS_QUERY_KEY],
    async ({ signal }) => {
      const response = await getPrePackagedRulesStatus({ signal });

      // TODO: https://github.com/elastic/kibana/pull/142950 Open a ticket for implementing automated camelCase normalization
      // https://dev.to/svehla/typescript-transform-case-strings-450b
      return {
        rulesCustomInstalled: response.rules_custom_installed,
        rulesInstalled: response.rules_installed,
        rulesNotInstalled: response.rules_not_installed,
        rulesNotUpdated: response.rules_not_updated,
        timelinesInstalled: response.timelines_installed,
        timelinesNotInstalled: response.timelines_not_installed,
        timelinesNotUpdated: response.timelines_not_updated,
      };
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
export const useInvalidatePrebuiltRulesStatus = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries([PREBUILT_RULES_STATUS_QUERY_KEY], {
      refetchType: 'active',
    });
  }, [queryClient]);
};
