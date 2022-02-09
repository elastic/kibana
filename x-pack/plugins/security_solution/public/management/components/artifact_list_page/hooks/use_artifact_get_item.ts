/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';

export const useArtifactGetItem = (
  apiClient: ExceptionsListApiClient,
  itemId: string,
  enabled: boolean = true
) => {
  return useQuery(['item', apiClient, itemId], () => apiClient.get(itemId), {
    enabled,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
};
