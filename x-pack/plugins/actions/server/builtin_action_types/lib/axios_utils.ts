/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObjectLike } from 'lodash';
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

export const throwIfRequestIsNotValid = ({
  connectorName,
  res,
  requiredAttributesToBeInTheResponse = [],
}: {
  connectorName: string;
  res: AxiosResponse;
  requiredAttributesToBeInTheResponse?: string[];
}) => {
  const requiredContentType = 'application/json';
  const contentType = res.headers['content-type'];
  const data = res.data;

  /**
   * This check ensures that the response is a valid JSON.
   * First we check that the content-type of the response is application/json.
   * Then we check the response is a JS object (data != null && typeof data === 'object')
   * in case the content type is application/json but for some reason the response is not.
   * Axios converts automatically JSON to JS objects.
   */
  if (contentType !== requiredContentType || !isObjectLike(data)) {
    throw new Error(getErrorMessage(connectorName, 'Response must be a valid JSON'));
  }

  if (requiredAttributesToBeInTheResponse.length > 0) {
    requiredAttributesToBeInTheResponse.forEach((attr) => {
      // Check only for undefined as null is a valid value
      if (data[attr] === undefined) {
        throw new Error(getErrorMessage(connectorName, 'Response is missing expected fields'));
      }
    });
  }
};
