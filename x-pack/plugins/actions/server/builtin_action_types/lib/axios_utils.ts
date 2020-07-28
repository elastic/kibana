/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AxiosInstance, Method, AxiosResponse } from 'axios';

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
}: {
  axios: AxiosInstance;
  url: string;
  method?: Method;
  data?: T;
  params?: unknown;
}): Promise<AxiosResponse> => {
  const res = await axios(url, { method, data: data ?? {}, params });
  throwIfNotAlive(res.status, res.headers['content-type']);
  return res;
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
