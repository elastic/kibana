/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosResponse } from 'axios';
import { Services, ProxySettings } from '../../types';
import { request } from './axios_utils';

interface PostPagerdutyOptions {
  apiUrl: string;
  data: unknown;
  headers: Record<string, string>;
  services: Services;
  proxySettings?: ProxySettings;
}

// post an event to pagerduty
export async function postPagerduty(options: PostPagerdutyOptions): Promise<AxiosResponse> {
  const { apiUrl, data, headers, proxySettings } = options;
  const axiosInstance = axios.create();

  return await request({
    axios: axiosInstance,
    url: apiUrl,
    data,
    proxySettings,
    headers,
    validateStatus: () => true,
  });
}
