/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { transformInput } from '../../../../detections/containers/detection_engine/rules/transforms';
import type { Rule } from '../../logic';
import { fetchRuleById } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';

const FIND_ONE_RULE_QUERY_KEY = 'findOneRule';

/**
 * A wrapper around useQuery provides default values to the underlying query,
 * like query key, abortion signal, and error handler.
 *
 * @param id - rule's id, not rule_id
 * @param options - react-query options
 * @returns useQuery result
 */
export const useRuleQuery = (id: string, options: UseQueryOptions<Rule>) => {
  return useQuery<Rule>(
    [FIND_ONE_RULE_QUERY_KEY, id],
    async ({ signal }) => {
      const response = await fetchRuleById({ signal, id });

      return transformInput(response);
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
    }
  );
};

/**
 * We should use this hook to invalidate the rules cache. For example, rule
 * mutations that affect rule set size, like creation or deletion, should lead
 * to cache invalidation.
 *
 * @returns A rules cache invalidation callback
 */
export const useInvalidateRule = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries([FIND_ONE_RULE_QUERY_KEY], {
      refetchType: 'active',
    });
  }, [queryClient]);
};
