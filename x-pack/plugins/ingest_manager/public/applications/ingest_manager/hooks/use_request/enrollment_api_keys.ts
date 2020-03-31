/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useRequest, UseRequestConfig } from './use_request';
import { enrollmentAPIKeyRouteService } from '../../services';
import { GetOneEnrollmentAPIKeyResponse, GetEnrollmentAPIKeysResponse } from '../../types';

type RequestOptions = Pick<Partial<UseRequestConfig>, 'pollIntervalMs'>;

export function useGetOneEnrollmentAPIKey(keyId: string, options?: RequestOptions) {
  return useRequest<GetOneEnrollmentAPIKeyResponse>({
    method: 'get',
    path: enrollmentAPIKeyRouteService.getInfoPath(keyId),
    ...options,
  });
}

export function useGetEnrollmentAPIKeys(options?: RequestOptions) {
  return useRequest<GetEnrollmentAPIKeysResponse>({
    method: 'get',
    path: enrollmentAPIKeyRouteService.getListPath(),
    ...options,
  });
}
