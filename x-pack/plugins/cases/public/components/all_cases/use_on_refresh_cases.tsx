/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { casesQueriesKeys } from '../../containers/constants';

/**
 * Using react-query queryClient to invalidate all the
 * cases table page cache namespace.
 *
 * This effectively clears the cache for all the cases table pages and
 * forces the page to fetch all the data again. Including
 * all cases, user profiles, statuses, metrics, tags, etc.
 */

export const useRefreshCases = () => {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries(casesQueriesKeys.casesList());
    queryClient.invalidateQueries(casesQueriesKeys.tags());
    queryClient.invalidateQueries(casesQueriesKeys.userProfiles());
  }, [queryClient]);
};
