/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../common/config';

// eslint-disable-next-line import/no-default-export
export default createTestConfig('spaces_only', {
  disabledPlugins: ['security'],
  license: 'trial',
  enableActionsProxy: false,
  rejectUnauthorized: false,
  verificationMode: undefined,
  customizeLocalHostSsl: true,
  preconfiguredAlertHistoryEsIndex: true,
  useDedicatedTaskRunner: true,
});
