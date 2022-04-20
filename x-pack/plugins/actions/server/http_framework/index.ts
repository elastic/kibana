/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { Logger } from '@kbn/core/server';
import { ActionsConfigurationUtilities } from '../actions_config';

import { ActionTypeRegistry } from '../action_type_registry';
import { register } from './register';
import { HTTPConnectorType } from './types';

export const createHTTPConnectorFramework = ({
  actionsConfigUtils: configurationUtilities,
  actionTypeRegistry,
  logger,
}: {
  actionTypeRegistry: PublicMethodsOf<ActionTypeRegistry>;
  logger: Logger;
  actionsConfigUtils: ActionsConfigurationUtilities;
}) => {
  return {
    registerConnector: <Config, Secrets>(connector: HTTPConnectorType) => {
      register({ actionTypeRegistry, logger, connector, configurationUtilities });
    },
  };
};
