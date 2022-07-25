/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRulesQueryArgs } from '../../../../../containers/detection_engine/rules/use_find_rules_query';
import { useFindRulesQuery } from '../../../../../containers/detection_engine/rules/use_find_rules_query';

interface UseFindRulesArgs extends FindRulesQueryArgs {
  isInMemorySorting: boolean;
  refetchInterval: number | false;
}

const MAX_RULES_PER_PAGE = 10000;

/**
 * This hook is used to fetch detection rules. Under the hood, it implements a
 * "feature switch" that allows switching from an in-memory implementation to a
 * backend-based implementation on the fly.
 *
 * @param args - find rules arguments
 * @returns rules query result
 */
export const useFindRules = (args: UseFindRulesArgs) => {
  const { pagination, filterOptions, sortingOptions, isInMemorySorting, refetchInterval } = args;

  // Use this query result when isInMemorySorting = true
  const allRules = useFindRulesQuery(
    ['all'],
    { pagination: { page: 1, perPage: MAX_RULES_PER_PAGE }, filterOptions },
    {
      refetchInterval,
      enabled: isInMemorySorting,
      keepPreviousData: true, // Use this option so that the state doesn't jump between "success" and "loading" on page change
    }
  );

  // Use this query result when isInMemorySorting = false
  const pagedRules = useFindRulesQuery(
    ['paged'],
    { pagination, filterOptions, sortingOptions },
    {
      refetchInterval,
      enabled: !isInMemorySorting,
      keepPreviousData: true, // Use this option so that the state doesn't jump between "success" and "loading" on page change
    }
  );

  return isInMemorySorting ? allRules : pagedRules;
};
