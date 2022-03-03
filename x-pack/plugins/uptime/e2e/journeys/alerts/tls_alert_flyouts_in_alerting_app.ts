/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before } from '@elastic/synthetics';
import { assertText, byTestId, loginToKibana, waitForLoadingToFinish } from '../utils';

journey('TlsFlyoutInAlertingApp', async ({ page, params }) => {
  before(async () => {
    await waitForLoadingToFinish({ page });
  });

  const baseUrl = `${params.kibanaUrl}/app/management/insightsAndAlerting/triggersActions/rules`;

  step('Go to Alerting app', async () => {
    await page.goto(`${baseUrl}`, {
      waitUntil: 'networkidle',
    });
    await loginToKibana({ page });
  });

  step('Open tls alert flyout', async () => {
    await page.click(byTestId('createFirstRuleButton'));
    await waitForLoadingToFinish({ page });
    await page.click(byTestId('"xpack.uptime.alerts.tlsCertificate-SelectOption"'));
    await waitForLoadingToFinish({ page });
    await assertText({ page, text: 'has a certificate expiring within' });
  });

  step('Tls alert flyout has setting values', async () => {
    await assertText({ page, text: '30 days' });
    await assertText({ page, text: '730 days' });
  });
});
