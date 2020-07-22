/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AxiosInstance, Method, AxiosResponse } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import HttpProxyAgent from 'http-proxy-agent';
import { ProxySettings } from '../../types';

export const throwIfNotAlive = (
  status: number,
  contentType: string,
  validStatusCodes: number[] = [200, 201, 204]
) => {
  if (!validStatusCodes.includes(status) || !contentType.includes('application/json')) {
    throw new Error('Instance is not alive.');
  }
};

export const request = async <T = unknown>({
  axios,
  url,
  method = 'get',
  data,
  params,
  proxySettings,
  headers,
  validateStatus,
}: {
  axios: AxiosInstance;
  url: string;
  method?: Method;
  data?: T;
  params?: unknown;
  proxySettings?: ProxySettings;
  headers?: Record<string, string> | null;
  validateStatus?: (status: number) => boolean;
}): Promise<AxiosResponse> => {
  const res = await axios(url, {
    method,
    data: data ?? {},
    params,
    // use (httpsAgent || httpsAgent)  and embedded proxy: false
    httpsAgent: getProxyAgent('https', proxySettings),
    httpAgent: getProxyAgent('http', proxySettings),
    proxy: false,
    headers,
    validateStatus,
  });
  throwIfNotAlive(res.status, res.headers['content-type']);
  return res;
};

const getProxyAgent = (
  agentProtocol: string,
  proxySettings?: ProxySettings
): HttpsProxyAgent | HttpProxyAgent | undefined => {
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

  if (proxyUrl.protocol !== agentProtocol) {
    return undefined;
  }

  if (/^https/.test(proxyUrl.protocol)) {
    return new HttpsProxyAgent({
      ...proxy,
      // do not fail on invalid certs
      rejectUnauthorized: false,
    });
  } else {
    return new HttpProxyAgent(proxy);
  }
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
