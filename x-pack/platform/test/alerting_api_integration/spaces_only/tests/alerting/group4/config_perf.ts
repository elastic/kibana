/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../../../common/config';

export default createTestConfig('spaces_only', {
  disabledPlugins: ['security'],
  license: 'trial',
  enableActionsProxy: false,
  verificationMode: 'none',
  customizeLocalHostSsl: true,
  preconfiguredAlertHistoryEsIndex: true,
  emailDomainsAllowed: ['example.org', 'test.com'],
  useDedicatedTaskRunner: true,
  maxAlerts: 800,
  testFiles: [require.resolve('./index_perf')],
  reportName: 'X-Pack Alerting API Integration Tests - Alerting - group4 - perf',
});
