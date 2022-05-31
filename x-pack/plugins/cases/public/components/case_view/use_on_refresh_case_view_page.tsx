/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { CASE_VIEW_CACHE_KEY } from '../../containers/constants';

export const useRefreshCaseViewPage = () => {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries(CASE_VIEW_CACHE_KEY);
  }, [queryClient]);
};
