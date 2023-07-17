/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { journey, step, expect, before } from '@elastic/synthetics';
import { byTestId, TIMEOUT_60_SEC } from '@kbn/observability-plugin/e2e/utils';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { cleanTestMonitors } from '../../synthetics/services/add_monitor';
import { monitorManagementPageProvider } from '../../../page_objects/uptime/monitor_management';

journey('AddPrivateLocationMonitor', async ({ page, params }) => {
  recordVideo(page);

  page.setDefaultTimeout(TIMEOUT_60_SEC.timeout);
  const kibanaUrl = params.kibanaUrl;

  const uptime = monitorManagementPageProvider({ page, kibanaUrl });
  const monitorName = `Private location monitor ${uuidv4()}`;

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
    await page.fill('input[name="name"]', monitorName);
    await page.click('label:has-text("Test private location Private")', TIMEOUT_60_SEC);
    await page.selectOption('select', 'http');
    await page.click(byTestId('syntheticsUrlField'));
    await page.fill(byTestId('syntheticsUrlField'), 'https://www.google.com');

    await page.click('text=Save monitor');

    await page.click(`text=${monitorName}`);

    await page.click('[data-test-subj="superDatePickerApplyTimeButton"]');
  });

  step('Integration cannot be edited in Fleet', async () => {
    await page.goto(`${kibanaUrl}/app/integrations/detail/synthetics/policies`);
    await page.waitForSelector('h1:has-text("Elastic Synthetics")');
    await page.click(`text=${monitorName}`);
    await page.waitForSelector('h1:has-text("Edit Elastic Synthetics integration")');
    await page.waitForSelector('text="This package policy is managed by the Synthetics app."');
  });

  step('Integration edit button leads to correct Synthetics edit page', async () => {
    const btn = await page.locator(byTestId('syntheticsEditMonitorButton'));
    expect(await btn.getAttribute('href')).toBe(`/app/synthetics/edit-monitor/${monitorId}`);
    await page.click('text="Edit in Synthetics"');

    await page.waitForSelector('h1:has-text("Edit Monitor")');
    await page.waitForSelector('h2:has-text("Monitor details")');
    expect(await page.inputValue('[data-test-subj="syntheticsMonitorConfigName"]')).toBe(
      monitorName
    );
  });
});
