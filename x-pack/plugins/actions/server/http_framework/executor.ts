/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { ActionsConfigurationUtilities } from '../actions_config';
import { ActionTypeConfig, ActionTypeSecrets, ExecutorType } from '../types';
import { ExecutorParams, HTTPConnectorType } from './types';

export const buildExecutor = ({
  configurationUtilities,
  connector,
  logger,
}: {
  connector: HTTPConnectorType;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): ExecutorType<ActionTypeConfig, ActionTypeSecrets, ExecutorParams, unknown> => {
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

    const subActions = service.getSubActions();
    const action = subActions.get(subAction);

    if (!action) {
      throw new Error('Unsupported sub action');
    }

    action.schema.validate(subActionParams);

    const data = await service[action.method](subActionParams);
    return { status: 'ok', data, actionId };
  };
};
