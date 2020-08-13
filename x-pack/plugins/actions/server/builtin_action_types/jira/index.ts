/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../../../../../src/core/server';
import { createConnector } from '../case/utils';
import { ActionType } from '../../types';

import { api } from './api';
import { config } from './config';
import { validate } from './validators';
import { createExternalService } from './service';
import { JiraSecretConfiguration, JiraPublicConfiguration } from './schema';
import { ActionsConfigurationUtilities } from '../../actions_config';

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
      config: JiraPublicConfiguration,
      secrets: JiraSecretConfiguration,
    },
    logger,
  })({ configurationUtilities });
}
