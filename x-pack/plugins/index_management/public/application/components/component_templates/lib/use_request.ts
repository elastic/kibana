/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';

import {
  UseRequestConfig,
  UseRequestResponse,
  sendRequest as _sendRequest,
  useRequest as _useRequest,
} from '../shared_imports';

export type UseRequestHook = <T = any>(config: UseRequestConfig) => UseRequestResponse<T>;

export const getUseRequest = (httpClient: HttpSetup): UseRequestHook => <T = any>(
  config: UseRequestConfig
) => {
  return _useRequest<T>(httpClient, config);
};
