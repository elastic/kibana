/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';

import {
  UseRequestConfig,
  UseRequestResponse,
  SendRequestConfig,
  SendRequestResponse,
  sendRequest as _sendRequest,
  useRequest as _useRequest,
  Error,
} from '../shared_imports';

export type UseRequestHook = <T = any, E = Error>(
  config: UseRequestConfig
) => UseRequestResponse<T, E>;
export type SendRequestHook = (config: SendRequestConfig) => Promise<SendRequestResponse>;

export const getUseRequest =
  (httpClient: HttpSetup): UseRequestHook =>
  <T = any, E = Error>(config: UseRequestConfig) => {
    return _useRequest<T, E>(httpClient, config);
  };

export const getSendRequest =
  (httpClient: HttpSetup): SendRequestHook =>
  <T = any>(config: SendRequestConfig) => {
    return _sendRequest<T>(httpClient, config);
  };
