/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  useRequest,
  UseRequestConfig,
  sendRequest,
  useConditionalRequest,
  SendConditionalRequestConfig,
} from './use_request';
import { enrollmentAPIKeyRouteService } from '../../services';
import {
  GetOneEnrollmentAPIKeyResponse,
  GetEnrollmentAPIKeysResponse,
  GetEnrollmentAPIKeysRequest,
} from '../../types';

type RequestOptions = Pick<Partial<UseRequestConfig>, 'pollIntervalMs'>;

export function useGetOneEnrollmentAPIKey(keyId: string | undefined) {
  return useConditionalRequest<GetOneEnrollmentAPIKeyResponse>({
    method: 'get',
    path: keyId ? enrollmentAPIKeyRouteService.getInfoPath(keyId) : undefined,
    shouldSendRequest: !!keyId,
  } as SendConditionalRequestConfig);
}

export function sendGetOneEnrollmentAPIKey(keyId: string, options?: RequestOptions) {
  return sendRequest<GetOneEnrollmentAPIKeyResponse>({
    method: 'get',
    path: enrollmentAPIKeyRouteService.getInfoPath(keyId),
    ...options,
  });
}

export function sendDeleteOneEnrollmentAPIKey(keyId: string, options?: RequestOptions) {
  return sendRequest({
    method: 'delete',
    path: enrollmentAPIKeyRouteService.getDeletePath(keyId),
    ...options,
  });
}

export function sendGetEnrollmentAPIKeys(
  query: GetEnrollmentAPIKeysRequest['query'],
  options?: RequestOptions
) {
  return sendRequest<GetEnrollmentAPIKeysResponse>({
    method: 'get',
    path: enrollmentAPIKeyRouteService.getListPath(),
    query,
    ...options,
  });
}

export function useGetEnrollmentAPIKeys(
  query: GetEnrollmentAPIKeysRequest['query'],
  options?: RequestOptions
) {
  return useRequest<GetEnrollmentAPIKeysResponse>({
    method: 'get',
    path: enrollmentAPIKeyRouteService.getListPath(),
    query,
    ...options,
  });
}
