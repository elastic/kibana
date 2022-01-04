/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosResponse, AxiosError } from 'axios';
import { Logger } from '../../../../../../src/core/server';
import { request } from './axios_utils';
import { promiseResult, Result } from '../lib/result_type';
import { ActionsConfigurationUtilities } from '../../actions_config';

interface PostXmattersOptions {
  url: string;
  data: unknown;
  basicAuth?: object;
}

// trigger a flow in xmatters
export async function postXmatters(
  options: PostXmattersOptions,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): Promise<Result<AxiosResponse, AxiosError>> {
  const { url, data, basicAuth } = options;
  const axiosInstance = axios.create();
  const result: Result<AxiosResponse, AxiosError> = await promiseResult(
    request({
      axios: axiosInstance,
      method: 'post',
      url,
      logger,
      ...basicAuth,
      data,
      configurationUtilities,
    })
  );

  return result;
}
