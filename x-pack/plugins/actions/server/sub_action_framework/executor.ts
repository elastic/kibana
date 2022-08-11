/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { ActionsConfigurationUtilities } from '../actions_config';
import { ExecutorType } from '../types';
import { ExecutorParams, SubActionConnectorType } from './types';

const isFunction = (v: unknown): v is Function => {
  return typeof v === 'function';
};

const getConnectorErrorMsg = (actionId: string, connector: { id: string; name: string }) =>
  `Connector id: ${actionId}. Connector name: ${connector.name}. Connector type: ${connector.id}`;

export const buildExecutor = <Config, Secrets>({
  configurationUtilities,
  connector,
  logger,
}: {
  connector: SubActionConnectorType<Config, Secrets>;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): ExecutorType<Config, Secrets, ExecutorParams, unknown> => {
  return async ({ actionId, params, config, secrets, services }) => {
    const subAction = params.subAction;
    const subActionParams = params.subActionParams;

    const service = new connector.Service({
      connector: { id: actionId, type: connector.id },
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
      throw new Error(
        `Sub action "${subAction}" is not registered. ${getConnectorErrorMsg(actionId, connector)}`
      );
    }

    const method = action.method;

    if (!service[method]) {
      throw new Error(
        `Method "${method}" does not exists in service. Sub action: "${subAction}". ${getConnectorErrorMsg(
          actionId,
          connector
        )}`
      );
    }

    const func = service[method];

    if (!isFunction(func)) {
      throw new Error(
        `Method "${method}" must be a function. ${getConnectorErrorMsg(actionId, connector)}`
      );
    }

    if (action.schema) {
      try {
        action.schema.validate(subActionParams);
      } catch (reqValidationError) {
        throw new Error(`Request validation failed (${reqValidationError})`);
      }
    }

    const data = await func.call(service, subActionParams);
    return { status: 'ok', data: data ?? {}, actionId };
  };
};
