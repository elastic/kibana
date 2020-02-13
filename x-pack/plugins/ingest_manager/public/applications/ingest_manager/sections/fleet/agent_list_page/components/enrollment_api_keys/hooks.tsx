/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Pagination, useRequest } from '../../../../../hooks';
import {
  GetEnrollmentAPIKeysResponse,
  GetOneEnrollmentAPIKeyResponse,
  GetAgentConfigsResponse,
} from '../../../../../types';
import { enrollmentAPIKeyRouteService, agentConfigRouteService } from '../../../../../services';

export function useEnrollmentApiKeys(pagination: Pagination) {
  const request = useRequest<GetEnrollmentAPIKeysResponse>({
    method: 'get',
    path: enrollmentAPIKeyRouteService.getListPath(),
  });

  return {
    data: request.data,
    isLoading: request.isLoading,
    refresh: () => request.sendRequest(),
  };
}

export function usePolicies() {
  const request = useRequest<GetAgentConfigsResponse>({
    method: 'get',
    path: agentConfigRouteService.getListPath(),
  });

  return {
    data: request.data ? request.data.items : [],
    isLoading: request.isLoading,
  };
}

export function useEnrollmentApiKey(apiKeyId: string | null) {
  const request = useRequest<GetOneEnrollmentAPIKeyResponse>({
    method: 'get',
    path: enrollmentAPIKeyRouteService.getInfoPath(apiKeyId as string),
  });

  return {
    data: request.data,
    isLoading: request.isLoading,
  };
}
