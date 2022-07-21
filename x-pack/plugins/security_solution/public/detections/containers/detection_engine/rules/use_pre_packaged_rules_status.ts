/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { getPrePackagedRulesStatus } from './api';
import * as i18n from './translations';

const ONE_MINUTE = 60000;

export interface PrePackagedRulesStatusResponse {
  rulesCustomInstalled: number;
  rulesInstalled: number;
  rulesNotInstalled: number;
  rulesNotUpdated: number;
  timelinesInstalled: number;
  timelinesNotInstalled: number;
  timelinesNotUpdated: number;
}

export const PRE_PACKAGED_RULES_STATUS_QUERY_KEY = 'prePackagedRulesStatus';

export const usePrePackagedRulesStatus = () => {
  const { addError } = useAppToasts();

  return useQuery<PrePackagedRulesStatusResponse>(
    [PRE_PACKAGED_RULES_STATUS_QUERY_KEY],
    async ({ signal }) => {
      const response = await getPrePackagedRulesStatus({ signal });

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
      staleTime: ONE_MINUTE * 5,
      onError: (err) => {
        addError(err, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE });
      },
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
export const useInvalidatePrePackagedRulesStatus = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(PRE_PACKAGED_RULES_STATUS_QUERY_KEY, {
      refetchActive: true,
      refetchInactive: false,
    });
  }, [queryClient]);
};
