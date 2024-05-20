/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SendRequestConfig,
  SendRequestResponse,
  UseRequestConfig,
  sendRequest as _sendRequest,
  useRequest as _useRequest,
  Error,
} from '../../shared_imports';

import { httpService } from './http';

export const sendRequest = <T = any, E = Error>(
  config: SendRequestConfig
): Promise<SendRequestResponse<T, E>> => {
  return _sendRequest(httpService.httpClient, config);
};

export const useRequest = <T = any, E = Error>(config: UseRequestConfig) => {
  return _useRequest<T, E>(httpService.httpClient, config);
};
