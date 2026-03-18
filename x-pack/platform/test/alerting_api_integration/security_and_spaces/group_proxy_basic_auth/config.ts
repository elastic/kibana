/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../common/config';

export default createTestConfig('security_and_spaces', {
  disabledPlugins: [],
  license: 'trial',
  ssl: true,
  enableActionsProxy: true,
  actionsProxyBasicAuth: { user: 'ftr_proxy_user', password: 'ftr_proxy_pass' },
  publicBaseUrl: true,
  testFiles: [require.resolve('./tests/http_proxy_basic_auth.ts')],
  useDedicatedTaskRunner: true,
  experimentalFeatures: [
    'sentinelOneConnectorOn',
    'crowdstrikeConnectorOn',
    'microsoftDefenderEndpointOn',
  ],
});
