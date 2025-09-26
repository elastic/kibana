/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerlessTestConfig } from '../../api_integration_deployment_agnostic/default_configs/serverless.config.base';
import { oneChatServices } from './ftr_provider_context';

export default createServerlessTestConfig({
  serverlessProject: 'es',
  services: oneChatServices,
  testFiles: [require.resolve('../apis')],
  junit: {
    reportName: 'X-Pack Agent Builder Serverless API Integration Tests',
  },
});
