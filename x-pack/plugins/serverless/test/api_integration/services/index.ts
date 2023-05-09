/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as xpackApiIntegrationServices } from '../../../../../test/api_integration/services';

import { ServerlessCommonApiServiceProvider } from './serverless_common_api';

export const services = {
  ...xpackApiIntegrationServices,

  serverlessCommonApi: ServerlessCommonApiServiceProvider,
};
