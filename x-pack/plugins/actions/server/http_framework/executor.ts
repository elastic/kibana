/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { ActionsConfigurationUtilities } from '../actions_config';
import { ActionTypeConfig, ActionTypeParams, ActionTypeSecrets, ExecutorType } from '../types';
import { HTTPConnectorType } from './types';

export const buildExecutor = <Config, Secrets>({
  configurationUtilities,
  connector,
  logger,
}: {
  connector: HTTPConnectorType<Config, Secrets>;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): ExecutorType<ActionTypeConfig, ActionTypeSecrets, ActionTypeParams, {}> => {
  return async ({ actionId, params, config, secrets }) => {
    const subAction = params.subAction;
    const subActionParams = params.subActionParams;

    const service = new connector.Service({
      config,
      configurationUtilities,
      logger,
      params,
      secrets,
    });

    const data = service[subAction](subActionParams);

    return { status: 'ok', data, actionId };
  };
};
