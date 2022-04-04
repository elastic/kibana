/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { ExecutorType } from '../types';
import { HTTPConnectorType, EndPoint, HandlerReturnType } from './types';

const buildHandler = <Config, Secrets, Params>({
  endpoint,
}: {
  endpoint: EndPoint<Config, Secrets, Params>;
}) => {
  return () => {
    return {};
  };
};

export const buildExecutor = <Config, Secrets, Params>({
  connector,
  logger,
}: {
  connector: HTTPConnectorType<Config, Secrets, Params>;
  logger: Logger;
}): ExecutorType<Config, Secrets, Params, HandlerReturnType> => {
  const endpoints: Record<string, () => HandlerReturnType> = {};

  for (const endpoint of Object.keys(connector.endpoints)) {
    endpoints[endpoint] = buildHandler<Config, Secrets, Params>({
      endpoint: connector.endpoints[endpoint],
    });
  }

  return async ({ actionId }) => {
    return { status: 'ok', data: {}, actionId };
  };
};
