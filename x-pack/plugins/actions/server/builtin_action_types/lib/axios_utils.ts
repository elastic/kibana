/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AxiosInstance, Method, AxiosResponse, AxiosBasicCredentials } from 'axios';
import { Logger } from '../../../../../../src/core/server';
import { ProxySettings } from '../../types';
import { getProxyAgent } from './get_proxy_agent';

export const request = async <T = unknown>({
  axios,
  url,
  logger,
  method = 'get',
  data,
  params,
  proxySettings,
  headers,
  validateStatus,
  auth,
}: {
  axios: AxiosInstance;
  url: string;
  logger: Logger;
  method?: Method;
  data?: T;
  params?: unknown;
  proxySettings?: ProxySettings;
  headers?: Record<string, string> | null;
  validateStatus?: (status: number) => boolean;
  auth?: AxiosBasicCredentials;
}): Promise<AxiosResponse> => {
  return await axios(url, {
    method,
    data: data ?? {},
    params,
    auth,
    // use httpsAgent and embedded proxy: false, to be able to handle fail on invalid certs
    httpsAgent: proxySettings ? getProxyAgent(proxySettings, logger) : undefined,
    httpAgent: proxySettings ? getProxyAgent(proxySettings, logger) : undefined,
    proxy: false, // the same way as it done for IncomingWebhook in
    headers,
    validateStatus,
  });
};

export const patch = async <T = unknown>({
  axios,
  url,
  data,
  logger,
  proxySettings,
}: {
  axios: AxiosInstance;
  url: string;
  data: T;
  logger: Logger;
  proxySettings?: ProxySettings;
}): Promise<AxiosResponse> => {
  return request({
    axios,
    url,
    logger,
    method: 'patch',
    data,
    proxySettings,
  });
};

export const addTimeZoneToDate = (date: string, timezone = 'GMT'): string => {
  return `${date} ${timezone}`;
};

export const getErrorMessage = (connector: string, msg: string) => {
  return `[Action][${connector}]: ${msg}`;
};
