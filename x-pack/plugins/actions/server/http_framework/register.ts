/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { Logger } from 'kibana/server';
import { ActionTypeRegistry } from '../action_type_registry';
import { buildExecutor } from './executor';
import { HTTPConnectorType } from './types';

export const register = <Config, Secrets, Params>({
  actionTypeRegistry,
  connector,
  logger,
}: {
  actionTypeRegistry: PublicMethodsOf<ActionTypeRegistry>;
  connector: HTTPConnectorType<Config, Secrets, Params>;
  logger: Logger;
}) => {
  const executor = buildExecutor<Config, Secrets, Params>({ connector, logger });

  actionTypeRegistry.register({
    id: connector.id,
    name: connector.name,
    minimumLicenseRequired: connector.minimumLicenseRequired,
    executor,
  });
};
