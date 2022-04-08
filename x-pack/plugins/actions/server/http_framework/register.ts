/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { Logger } from 'kibana/server';
import { ActionsConfigurationUtilities } from '../actions_config';
import { ActionTypeRegistry } from '../action_type_registry';
import { CaseConnector } from '../connectors/case';
import { ActionTypeConfig, ActionTypeSecrets } from '../types';
import { buildExecutor } from './executor';
import { ExecutorParams, HTTPConnectorType, IService } from './types';
import { buildValidators } from './validators';

// TODO: Add basic connector
const validateService = <Config, Secrets>(Service: IService<Config, Secrets>) => {
  if (!(Service.prototype instanceof CaseConnector)) {
    throw new Error('Service must be extend one of the abstract classes: CaseConnector');
  }
};

export const register = <Config extends ActionTypeConfig, Secrets extends ActionTypeSecrets>({
  actionTypeRegistry,
  connector,
  logger,
  configurationUtilities,
}: {
  configurationUtilities: ActionsConfigurationUtilities;
  actionTypeRegistry: PublicMethodsOf<ActionTypeRegistry>;
  connector: HTTPConnectorType<Config, Secrets>;
  logger: Logger;
}) => {
  validateService(connector.Service);

  const validators = buildValidators<Config, Secrets>({ connector, configurationUtilities });
  const executor = buildExecutor({
    connector,
    logger,
    configurationUtilities,
  });

  actionTypeRegistry.register<Config, Secrets, ExecutorParams, unknown>({
    id: connector.id,
    name: connector.name,
    minimumLicenseRequired: connector.minimumLicenseRequired,
    validate: validators,
    executor,
  });
};
