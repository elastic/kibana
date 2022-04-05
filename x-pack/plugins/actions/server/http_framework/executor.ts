/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { Logger } from 'kibana/server';
import { ActionsConfigurationUtilities } from '../actions_config';
import { request } from '../builtin_action_types/lib/axios_utils';
import { ExecutorType } from '../types';
import { HTTPConnectorType, EndPoint, HandlerReturnType, EndPointFunc, HandlerFunc } from './types';

const isEndpointFunction = (endpoint: unknown): endpoint is EndPointFunc =>
  typeof endpoint === 'function';

const buildHandler = <Config, Secrets, Params>({
  configurationUtilities,
  endpoint,
  connector,
  logger,
}: {
  configurationUtilities: ActionsConfigurationUtilities;
  endpoint: EndPoint<Config, Secrets, Params>;
  connector: HTTPConnectorType<Config, Secrets, Params>;
  logger: Logger;
}): HandlerFunc => {
  return async () => {
    if (isEndpointFunction(endpoint)) {
      return await endpoint();
    }

    const axiosInstance = axios.create({
      auth: endpoint.getAuth(connector.schema.secrets),
    });

    const res = await request({
      axios: axiosInstance,
      method: endpoint.method,
      url: endpoint.getPath(connector.schema.config),
      logger,
      configurationUtilities,
    });

    return res;
  };
};

export const buildExecutor = <Config, Secrets, Params>({
  configurationUtilities,
  connector,
  logger,
}: {
  connector: HTTPConnectorType<Config, Secrets, Params>;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): ExecutorType<Config, Secrets, Params, HandlerReturnType> => {
  const endpoints: Record<string, HandlerFunc> = {};

  for (const endpoint of Object.keys(connector.endpoints)) {
    endpoints[endpoint] = buildHandler<Config, Secrets, Params>({
      endpoint: connector.endpoints[endpoint],
      connector,
      configurationUtilities,
      logger,
    });
  }

  return async ({ actionId }) => {
    const data = await endpoints.createIncident();
    return { status: 'ok', data, actionId };
  };
};
