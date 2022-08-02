/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import type { HttpSetup } from '@kbn/core/public';

import {
  sendRequest as _sendRequest,
  useRequest as _useRequest,
} from '@kbn/es-ui-shared-plugin/public';
import type {
  SendRequestConfig,
  SendRequestResponse,
  UseRequestConfig,
} from '@kbn/es-ui-shared-plugin/public';

let httpClient: HttpSetup;

export type { UseRequestConfig } from '@kbn/es-ui-shared-plugin/public';

/**
 * @internal
 */
export interface RequestError extends Error {
  statusCode?: number;
}

export const setHttpClient = (client: HttpSetup) => {
  httpClient = client;
};

export const sendRequest = <D = any, E = RequestError>(
  config: SendRequestConfig
): Promise<SendRequestResponse<D, E>> => {
  if (!httpClient) {
    throw new Error('sendRequest has no http client set');
  }
  return _sendRequest<D, E>(httpClient, config);
};

export const useRequest = <D = any, E = RequestError>(config: UseRequestConfig) => {
  if (!httpClient) {
    throw new Error('sendRequest has no http client set');
  }
  return _useRequest<D, E>(httpClient, config);
};

export type SendConditionalRequestConfig =
  | (SendRequestConfig & { shouldSendRequest: true })
  | (Partial<SendRequestConfig> & { shouldSendRequest: false });

export const useConditionalRequest = <D = any, E = RequestError>(
  config: SendConditionalRequestConfig
) => {
  const [state, setState] = useState<{
    error: RequestError | null;
    data: D | null;
    isLoading: boolean;
  }>({
    error: null,
    data: null,
    isLoading: false,
  });

  const { path, method, shouldSendRequest, query, body } = config;

  async function sendGetOneEnrollmentAPIKeyRequest() {
    if (!config.shouldSendRequest) {
      setState({
        data: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      setState({
        data: null,
        isLoading: true,
        error: null,
      });
      const res = await sendRequest<D, E>({
        method: config.method,
        path: config.path,
        query: config.query,
        body: config.body,
      });
      if (res.error) {
        throw res.error;
      }
      setState({
        data: res.data,
        isLoading: false,
        error: null,
      });
      return res;
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error,
      });
    }
  }

  useEffect(() => {
    sendGetOneEnrollmentAPIKeyRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, method, shouldSendRequest, JSON.stringify(query), JSON.stringify(body)]);

  return { ...state, sendRequest: sendGetOneEnrollmentAPIKeyRequest };
};
