/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { CASE_TAGS_CACHE_KEY, CASE_VIEW_CACHE_KEY } from '../../containers/constants';

/**
 * Using react-query queryClient to invalidate all the
 * case view page cache namespace.
 *
 * This effectively clears the cache for all the case view pages and
 * forces the page to fetch all the data again. Including
 * metrics, actions, comments, etc.
 */
export const useRefreshCaseViewPage = () => {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries(CASE_VIEW_CACHE_KEY);
    queryClient.invalidateQueries(CASE_TAGS_CACHE_KEY);
  }, [queryClient]);
};
