/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { outputRoutesService } from '../../services';
import type {
  PutOutputRequest,
  GetOutputsResponse,
  PostOutputRequest,
  PostLogstashApiKeyResponse,
} from '../../types';

import { sendRequest, useRequest } from './use_request';

export function useGetOutputs() {
  return useRequest<GetOutputsResponse>({
    method: 'get',
    path: outputRoutesService.getListPath(),
  });
}

export function useDefaultOutput() {
  const outputsRequest = useGetOutputs();
  const output = outputsRequest.data?.items.find((o) => o.is_default);

  return { output, refresh: outputsRequest.resendRequest };
}

export function sendPutOutput(outputId: string, body: PutOutputRequest['body']) {
  return sendRequest({
    method: 'put',
    path: outputRoutesService.getUpdatePath(outputId),
    body,
  });
}

export function sendPostLogstashApiKeys() {
  return sendRequest<PostLogstashApiKeyResponse>({
    method: 'post',
    path: outputRoutesService.getCreateLogstashApiKeyPath(),
  });
}

export function sendPostOutput(body: PostOutputRequest['body']) {
  return sendRequest({
    method: 'post',
    path: outputRoutesService.getCreatePath(),
    body,
  });
}

export function sendDeleteOutput(outputId: string) {
  return sendRequest({
    method: 'delete',
    path: outputRoutesService.getDeletePath(outputId),
  });
}
