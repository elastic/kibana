/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseRequestConfig } from '../../../../../../src/plugins/es_ui_shared/public/request/use_request';
import { enrollmentAPIKeyRouteService } from '../../../common/services/routes';
import type {
  GetEnrollmentAPIKeysRequest,
  GetEnrollmentAPIKeysResponse,
  GetOneEnrollmentAPIKeyResponse,
  PostEnrollmentAPIKeyRequest,
  PostEnrollmentAPIKeyResponse,
} from '../../../common/types/rest_spec/enrollment_api_key';

import type { SendConditionalRequestConfig } from './use_request';
import { sendRequest, useConditionalRequest, useRequest } from './use_request';

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

export function sendCreateEnrollmentAPIKey(body: PostEnrollmentAPIKeyRequest['body']) {
  return sendRequest<PostEnrollmentAPIKeyResponse>({
    method: 'post',
    path: enrollmentAPIKeyRouteService.getCreatePath(),
    body,
  });
}
