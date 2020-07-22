/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AxiosInstance,
  Method,
  AxiosResponse,
  AxiosProxyConfig,
  AxiosBasicCredentials,
} from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ProxySettings } from '../../types';

export const request = async <T = unknown>({
  axios,
  url,
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
    httpsAgent: getProxyAgent(proxySettings),
    proxy: getProxy(proxySettings),
    headers,
    validateStatus,
  });
};

const getProxyAgent = (proxySettings?: ProxySettings): HttpsProxyAgent | undefined => {
  if (!proxySettings) {
    return undefined;
  }
  const proxyUrl = new URL(proxySettings.proxyUrl);
  const proxy = {
    host: proxyUrl.host,
    port: proxyUrl.port,
    protocol: proxyUrl.protocol,
    headers: proxySettings.proxyHeaders,
  };

  if (/^https/.test(proxyUrl.protocol)) {
    return new HttpsProxyAgent({
      ...proxy,
      // do not fail on invalid certs
      rejectUnauthorized: false,
    });
  }
  return undefined;
};

const getProxy = (proxySettings?: ProxySettings): AxiosProxyConfig | false => {
  if (!proxySettings) {
    return false;
  }
  const proxyUrl = new URL(proxySettings.proxyUrl);
  if (/^http:/.test(proxyUrl.protocol)) {
    return {
      host: proxyUrl.host,
      port: Number(proxyUrl.port),
    };
  }
  return false;
};

export const patch = async <T = unknown>({
  axios,
  url,
  data,
}: {
  axios: AxiosInstance;
  url: string;
  data: T;
}): Promise<AxiosResponse> => {
  return request({
    axios,
    url,
    method: 'patch',
    data,
  });
};

export const addTimeZoneToDate = (date: string, timezone = 'GMT'): string => {
  return `${date} ${timezone}`;
};

export const getErrorMessage = (connector: string, msg: string) => {
  return `[Action][${connector}]: ${msg}`;
};
