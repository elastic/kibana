/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '../../../../hooks/use_fetcher';
import type { SavedServiceGroup } from '../../../../../common/service_groups';

export interface UseServiceGroupsResult {
  serviceGroups: SavedServiceGroup[];
  loading: boolean;
}

/**
 * Hook to fetch all available service groups
 */
export function useServiceGroups(): UseServiceGroupsResult {
  const { data, status } = useFetcher((callApmApi) => {
    return callApmApi('GET /internal/apm/service-groups');
  }, []);

  return {
    serviceGroups: data?.serviceGroups ?? [],
    loading: status === 'loading',
  };
}
