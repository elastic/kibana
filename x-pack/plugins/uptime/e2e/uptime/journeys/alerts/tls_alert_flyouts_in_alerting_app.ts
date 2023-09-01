/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, expect } from '@elastic/synthetics';
import { byTestId, assertText, waitForLoadingToFinish } from '../../../helpers/utils';
import { recordVideo } from '../../../helpers/record_video';
import { loginPageProvider } from '../../../page_objects/login';

journey('TlsFlyoutInAlertingApp', async ({ page, params }) => {
  recordVideo(page);

  const login = loginPageProvider({ page });
  before(async () => {
    await waitForLoadingToFinish({ page });
  });

  const baseUrl = `${params.kibanaUrl}/app/management/insightsAndAlerting/triggersActions/rules`;

  step('Go to Alerting app', async () => {
    await page.goto(`${baseUrl}`, {
      waitUntil: 'networkidle',
    });
    await login.loginToKibana();
  });

  step('Open tls alert flyout', async () => {
    await page.click('text=Create rule');
    await waitForLoadingToFinish({ page });
    await page.click(byTestId('"xpack.uptime.alerts.tlsCertificate-SelectOption"'));
    await waitForLoadingToFinish({ page });
    await assertText({ page, text: 'has a certificate expiring within' });
  });

  step('Tls alert flyout has setting values', async () => {
    expect(await page.locator(byTestId('tlsExpirationThreshold')).textContent()).toBe(
      'has a certificate expiring within days:  30'
    );
    expect(await page.locator(byTestId('tlsAgeExpirationThreshold')).textContent()).toBe(
      'or older than days:  730'
    );
  });
});
