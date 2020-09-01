/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../../../../../src/core/server';
import { createConnector } from '../case/utils';

import { api } from './api';
import { config } from './config';
import { validate } from './validators';
import { createExternalService } from './service';
import { ResilientSecretConfiguration, ResilientPublicConfiguration } from './schema';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { ActionType } from '../../types';

export function getActionType({
  logger,
  configurationUtilities,
}: {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): ActionType {
  return createConnector({
    api,
    config,
    validate,
    createExternalService,
    validationSchema: {
      config: ResilientPublicConfiguration,
      secrets: ResilientSecretConfiguration,
    },
    logger,
  })({ configurationUtilities });
}
