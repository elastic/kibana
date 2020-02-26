/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Pagination,
  useGetAgentConfigs,
  useGetEnrollmentAPIKeys,
  useGetOneEnrollmentAPIKey,
} from '../../../../../hooks';

export function useEnrollmentApiKeys(pagination: Pagination) {
  const request = useGetEnrollmentAPIKeys();

  return {
    data: request.data,
    isLoading: request.isLoading,
    refresh: () => request.sendRequest(),
  };
}

export function useConfigs() {
  const request = useGetAgentConfigs();

  return {
    data: request.data ? request.data.items : [],
    isLoading: request.isLoading,
  };
}

export function useEnrollmentApiKey(apiKeyId: string | null) {
  const request = useGetOneEnrollmentAPIKey(apiKeyId as string);

  return {
    data: request.data,
    isLoading: request.isLoading,
  };
}
