/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { INTERNAL_ALERTING_FIND_RULES } from '../../../../../common/constants';
import type { RuleSnoozeSettings } from '../../logic';
import { fetchRulesSnoozeSettings } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';

const FETCH_RULE_SNOOZE_SETTINGS_QUERY_KEY = ['GET', INTERNAL_ALERTING_FIND_RULES];

/**
 * A wrapper around useQuery provides default values to the underlying query,
 * like query key, abortion signal.
 *
 * @param queryArgs - fetch rule snoozing settings ids
 * @param queryOptions - react-query options
 * @returns useQuery result
 */
export const useFetchRulesSnoozeSettings = (
  ids: string[],
  queryOptions?: UseQueryOptions<RuleSnoozeSettings[], Error, RuleSnoozeSettings[], string[]>
) => {
  return useQuery(
    [...FETCH_RULE_SNOOZE_SETTINGS_QUERY_KEY, ...ids],
    async ({ signal }) => {
      const response = await fetchRulesSnoozeSettings({ ids, signal });

      return response.data;
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...queryOptions,
    }
  );
};

/**
 * We should use this hook to invalidate the cache. For example, rule
 * snooze modification should lead to cache invalidation.
 *
 * @returns A rules cache invalidation callback
 */
export const useInvalidateFetchRulesSnoozeSettingsQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    /**
     * Invalidate all queries that start with FIND_RULES_QUERY_KEY. This
     * includes the in-memory query cache and paged query cache.
     */
    queryClient.invalidateQueries(FETCH_RULE_SNOOZE_SETTINGS_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
