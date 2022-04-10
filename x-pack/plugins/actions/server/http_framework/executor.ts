/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { ActionsConfigurationUtilities } from '../actions_config';
import { ExecutorType } from '../types';
import { ExecutorParams, HTTPConnectorType } from './types';

const isFunction = (v: unknown): v is Function => {
  return typeof v === 'function';
};

export const buildExecutor = <Config, Secrets>({
  configurationUtilities,
  connector,
  logger,
}: {
  connector: HTTPConnectorType<Config, Secrets>;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): ExecutorType<Config, Secrets, ExecutorParams, unknown> => {
  return async ({ actionId, params, config, secrets, services }) => {
    const subAction = params.subAction;
    const subActionParams = params.subActionParams;

    const service = new connector.Service({
      config,
      secrets,
      configurationUtilities,
      logger,
      services,
    });

    const subActions = service.getSubActions();

    if (subActions.size === 0) {
      throw new Error('You should register at least one subAction for your connector type');
    }

    const action = subActions.get(subAction);

    if (!action) {
      throw new Error('Sub action not registered');
    }

    const method = action.method;

    if (!service[method]) {
      throw new Error('Not valid method for registered sub action');
    }

    const func = service[method];

    if (!isFunction(func)) {
      throw new Error('Method must be a valid function');
    }

    if (action.schema) {
      action.schema.validate(subActionParams);
    }

    const data = await func.call(service, subActionParams);
    return { status: 'ok', data: data ?? {}, actionId };
  };
};
