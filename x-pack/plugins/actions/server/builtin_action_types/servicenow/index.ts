/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createConnector } from '../common/utils';

import { api } from './api';
import { config } from './config';
import { validate } from './validators';
import { createExternalService } from './service';
import { ConnectorPublicConfiguration, ConnectorSecretConfiguration } from '../common/schema';

export const getActionType = createConnector({
  api,
  config,
  validate,
  createExternalService,
  validationSchema: {
    config: ConnectorPublicConfiguration,
    secrets: ConnectorSecretConfiguration,
  },
});
