/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SendRequestConfig,
  SendRequestResponse,
  UseRequestConfig,
  sendRequest as _sendRequest,
  useRequest as _useRequest,
} from '../../shared_imports';

import { httpService } from './http';

export const sendRequest = (config: SendRequestConfig): Promise<SendRequestResponse> => {
  return _sendRequest(httpService.httpClient, config);
};

export const useRequest = <T = any>(config: UseRequestConfig) => {
  return _useRequest<T>(httpService.httpClient, config);
};
