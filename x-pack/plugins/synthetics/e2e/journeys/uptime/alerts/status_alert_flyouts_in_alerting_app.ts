/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before } from '@elastic/synthetics';
import { assertText, byTestId, waitForLoadingToFinish } from '@kbn/observability-plugin/e2e/utils';
import { RetryService } from '@kbn/ftr-common-functional-services';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { loginPageProvider } from '../../../page_objects/login';

journey('StatusFlyoutInAlertingApp', async ({ page, params }) => {
  recordVideo(page);

  const login = loginPageProvider({ page });
  before(async () => {
    await waitForLoadingToFinish({ page });
  });
  const getService = params.getService;
  const retry: RetryService = getService('retry');
  const baseUrl = `${params.kibanaUrl}/app/management/insightsAndAlerting/triggersActions/rules`;

  step('Go to Alerting app', async () => {
    await page.goto(`${baseUrl}`, {
      waitUntil: 'networkidle',
    });
    await login.loginToKibana();
  });

  step('Open monitor status flyout', async () => {
    await page.click('text=Create rule');
    await waitForLoadingToFinish({ page });
    await page.click(byTestId('"xpack.uptime.alerts.monitorStatus-SelectOption"'));
    await waitForLoadingToFinish({ page });

    await retry.tryForTime(60 * 1000, async () => {
      const text = await page.textContent(byTestId('alertSnapShotCount'));
      expect(text).toContain('This alert will apply to approximately');
      const getNUmber = text?.split('This alert will apply to approximately ')[1][0];
      expect(Number(getNUmber)).toBeGreaterThan(0);
    });
  });

  step('can add filters', async () => {
    await page.click('text=Add filter');
    await page.click(byTestId('"uptimeAlertAddFilter.monitor.type"'));
    await page.click(byTestId('"uptimeCreateStatusAlert.filter_scheme"'));
  });

  step('can open query bar', async () => {
    await page.click(byTestId('"xpack.synthetics.alerts.monitorStatus.filterBar"'));

    await page.fill(
      byTestId('"xpack.synthetics.alerts.monitorStatus.filterBar"'),
      'monitor.type : '
    );

    await waitForLoadingToFinish({ page });

    await page.click(byTestId('"xpack.synthetics.alerts.monitorStatus.filterBar"'));

    await page.waitForSelector(`text=browser`);
    await page.waitForSelector(`text=http`);

    await retry.tryForTime(30 * 1000, async () => {
      await page.click('text=browser');

      const element = await page.waitForSelector(
        byTestId('"xpack.synthetics.alerts.monitorStatus.filterBar"')
      );

      expect((await element?.textContent())?.trim()).toBe('monitor.type : "browser"');
    });

    await page.click(byTestId('euiFlyoutCloseButton'));
    await page.click(byTestId('confirmModalConfirmButton'));
  });

  step('Open tls alert flyout', async () => {
    await page.click('text=Create rule');
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
