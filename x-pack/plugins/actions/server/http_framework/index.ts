/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { Logger } from 'kibana/server';

import { ActionTypeRegistry } from '../action_type_registry';
import { register } from './register';
import { HTTPConnectorType } from './types';

export const createHTTPConnectorFramework = ({
  actionTypeRegistry,
  logger,
}: {
  actionTypeRegistry: PublicMethodsOf<ActionTypeRegistry>;
  logger: Logger;
}) => {
  return {
    registerConnector: <Config, Secrets, Params>(
      connector: HTTPConnectorType<Config, Secrets, Params>
    ) => {
      register({ actionTypeRegistry, logger, connector });
    },
  };
};
