/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { journey, step, expect, before } from '@elastic/synthetics';
import { assertText, byTestId, TIMEOUT_60_SEC } from '@kbn/observability-plugin/e2e/utils';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { cleanTestMonitors } from '../../synthetics/services/add_monitor';
import { monitorManagementPageProvider } from '../../../page_objects/uptime/monitor_management';

journey('AddPrivateLocationMonitor', async ({ page, params }) => {
  recordVideo(page);

  page.setDefaultTimeout(TIMEOUT_60_SEC.timeout);
  const kibanaUrl = params.kibanaUrl;

  const uptime = monitorManagementPageProvider({ page, kibanaUrl });

  let monitorId: string;

  before(async () => {
    await cleanTestMonitors(params);
    page.on('request', (evt) => {
      if (
        evt.resourceType() === 'fetch' &&
        evt.url().includes('/internal/uptime/service/monitors?preserve_namespace=true')
      ) {
        evt
          .response()
          ?.then((res) => res?.json())
          .then((res) => {
            monitorId = res.id;
          });
      }
    });
  });

  step('Go to monitor-management', async () => {
    await uptime.navigateToMonitorManagement();
  });

  step('login to Kibana', async () => {
    await uptime.loginToKibana();
    const invalid = await page.locator(`text=Username or password is incorrect. Please try again.`);
    expect(await invalid.isVisible()).toBeFalsy();
  });

  step('enable management', async () => {
    await uptime.enableMonitorManagement();
  });

  step('Click text=Add monitor', async () => {
    await page.click('text=Add monitor');
    expect(page.url()).toBe(`${kibanaUrl}/app/uptime/add-monitor`);
    await uptime.waitForLoadingToFinish();

    await page.click('input[name="name"]');
    await page.fill('input[name="name"]', 'Private location monitor');
    await page.click('label:has-text("Test private location Private")');
    await page.selectOption('select', 'http');
    await page.click(byTestId('syntheticsUrlField'));
    await page.fill(byTestId('syntheticsUrlField'), 'https://www.google.com');

    await page.click('text=Save monitor');

    await page.click('text=Private location monitor');

    await page.click('[data-test-subj="superDatePickerApplyTimeButton"]');
  });
  step('Click [placeholder="Find apps, content, and more."]', async () => {
    await page.click('[placeholder="Find apps, content, and more."]');
    await page.fill('[placeholder="Find apps, content, and more."]', 'integ');
    await Promise.all([
      page.waitForNavigation(/* { url: '${kibanaUrl}/app/integrations/browse' }*/),
      page.click('text=Integrations'),
    ]);
    await page.click('text=Display beta integrations');
    await page.click('text=Installed integrations');
    expect(page.url()).toBe(`${kibanaUrl}/app/integrations/installed`);
    await page.click(`text=Elastic Synthetics`);
    await page.click('text=Integration policies');
  });
  step('Click text=Edit Elastic Synthetics integration', async () => {
    await assertText({ page, text: 'This table contains 1 rows out of 1 rows; Page 1 of 1.' });
    await page.click('[data-test-subj="integrationNameLink"]');
    const btn = await page.locator(byTestId('syntheticsEditMonitorButton'));
    expect(await btn.getAttribute('href')).toBe(`/app/synthetics/edit-monitor/${monitorId}`);
    await btn.click();
    await page.click('text=Private location monitor');
  });
});
