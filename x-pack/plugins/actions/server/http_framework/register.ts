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
import { buildExecutor } from './executor';
import { HTTPConnectorType, IService } from './types';
import { buildValidators } from './validators';

// TODO: Add basic connector
const validateService = (Service: IService) => {
  if (!(Service.prototype instanceof CaseConnector)) {
    throw new Error('Service must be extend one of the abstract classes: CaseConnector');
  }
};

export const register = <Config, Secrets>({
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

  const validators = buildValidators({ connector, configurationUtilities });
  const executor = buildExecutor<Config, Secrets>({
    connector,
    logger,
    configurationUtilities,
  });

  actionTypeRegistry.register({
    id: connector.id,
    name: connector.name,
    minimumLicenseRequired: connector.minimumLicenseRequired,
    validate: validators,
    executor,
  });
};
