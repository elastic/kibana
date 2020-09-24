/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpClient } from 'src/core/public';

import {
  UseRequestConfig,
  UseRequestResponse,
  SendRequestConfig,
  SendRequestResponse,
  sendRequest as _sendRequest,
  useRequest as _useRequest,
} from '../shared_imports';

export type UseRequestHook = <T = any, E = Error>(
  config: UseRequestConfig
) => UseRequestResponse<T, E>;
export type SendRequestHook = (config: SendRequestConfig) => Promise<SendRequestResponse>;

export const getUseRequest = (httpClient: HttpClient): UseRequestHook => <T = any, E = Error>(
  config: UseRequestConfig
) => {
  return _useRequest<T, E>(httpClient, config);
};

export const getSendRequest = (httpClient: HttpClient): SendRequestHook => <T = any>(
  config: SendRequestConfig
) => {
  return _sendRequest<T>(httpClient, config);
};
