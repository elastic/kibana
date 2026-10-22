/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../../../../../common/config';

export const recipientAllowList = ['*.bar@example.org', '*@test.com'];
export const nonTrialRecipientAllowList = ['*@non-trial.example.org'];

export default createTestConfig('spaces_only-recipient_allowlist', {
  disabledPlugins: ['security'],
  license: 'trial',
  enableActionsProxy: false,
  verificationMode: 'none',
  customizeLocalHostSsl: true,
  preconfiguredAlertHistoryEsIndex: true,
  emailRecipientAllowlist: nonTrialRecipientAllowList,
  emailRecipientAllowlistInTrial: recipientAllowList,
  licensingApiPollingFrequency: '1s',
  useDedicatedTaskRunner: true,
  testFiles: [require.resolve('.')],
  reportName: 'X-Pack Alerting API Integration Tests - Email Recipient Allowlist',
  enableFooterInEmail: false,
});
