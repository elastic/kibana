/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosResponse } from 'axios';
import { Logger } from '../../../../../../src/core/server';
import { request } from './axios_utils';
import { ActionsConfigurationUtilities } from '../../actions_config';

interface PostXmattersOptions {
  url: string;
  data: {
    alertActionGroupName?: string;
    signalId?: string;
    ruleName?: string;
    date?: string;
    severity: string;
    spaceId?: string;
    tags?: string;
  };
  basicAuth?: {
    auth: {
      username: string;
      password: string;
    };
  };
}

// trigger a flow in xmatters
export async function postXmatters(
  options: PostXmattersOptions,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): Promise<AxiosResponse> {
  const { url, data, basicAuth } = options;
  const axiosInstance = axios.create();
  return await request({
    axios: axiosInstance,
    method: 'post',
    url,
    logger,
    ...basicAuth,
    data,
    configurationUtilities,
    validateStatus: () => true,
  });
}
