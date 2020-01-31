/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpSetup } from 'kibana/public';
import {
  SendRequestConfig,
  SendRequestResponse,
  UseRequestConfig,
  sendRequest as _sendRequest,
  useRequest as _useRequest,
} from '../../../../../../../../src/plugins/es_ui_shared/public';

let httpClient: HttpSetup;

export const setHttpClient = (client: HttpSetup) => {
  httpClient = client;
};

export const sendRequest = <D = any>(
  config: SendRequestConfig
): Promise<SendRequestResponse<D>> => {
  if (!httpClient) {
    throw new Error('sendRequest has no http client set');
  }
  return _sendRequest<D>(httpClient, config);
};

export const useRequest = <D = any>(config: UseRequestConfig) => {
  if (!httpClient) {
    throw new Error('sendRequest has no http client set');
  }
  return _useRequest<D>(httpClient, config);
};
