/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosInstance, Method, AxiosResponse, AxiosBasicCredentials } from 'axios';
import { Logger } from '../../../../../../src/core/server';
import { getCustomAgents } from './get_custom_agents';
import { ActionsConfigurationUtilities } from '../../actions_config';

export const request = async <T = unknown>({
  axios,
  url,
  logger,
  method = 'get',
  data,
  configurationUtilities,
  ...rest
}: {
  axios: AxiosInstance;
  url: string;
  logger: Logger;
  method?: Method;
  data?: T;
  params?: unknown;
  configurationUtilities: ActionsConfigurationUtilities;
  headers?: Record<string, string> | null;
  validateStatus?: (status: number) => boolean;
  auth?: AxiosBasicCredentials;
}): Promise<AxiosResponse> => {
  const { httpAgent, httpsAgent } = getCustomAgents(configurationUtilities, logger, url);
  const { maxContentLength, timeout } = configurationUtilities.getResponseSettings();

  return await axios(url, {
    ...rest,
    method,
    data: data ?? {},
    // use httpAgent and httpsAgent and set axios proxy: false, to be able to handle fail on invalid certs
    httpAgent,
    httpsAgent,
    proxy: false,
    maxContentLength,
    timeout,
  });
};

export const patch = async <T = unknown>({
  axios,
  url,
  data,
  logger,
  configurationUtilities,
}: {
  axios: AxiosInstance;
  url: string;
  data: T;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): Promise<AxiosResponse> => {
  return request({
    axios,
    url,
    logger,
    method: 'patch',
    data,
    configurationUtilities,
  });
};

export const addTimeZoneToDate = (date: string, timezone = 'GMT'): string => {
  return `${date} ${timezone}`;
};

export const getErrorMessage = (connector: string, msg: string) => {
  return `[Action][${connector}]: ${msg}`;
};
