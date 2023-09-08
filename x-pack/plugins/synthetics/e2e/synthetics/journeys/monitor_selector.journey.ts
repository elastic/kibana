/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before, after } from '@elastic/synthetics';
import { byTestId } from '../../helpers/utils';
import { recordVideo } from '../../helpers/record_video';
import {
  addTestMonitor,
  cleanTestMonitors,
  enableMonitorManagedViaApi,
} from './services/add_monitor';
import { syntheticsAppPageProvider } from '../page_objects/synthetics_app';

journey(`MonitorSelector`, async ({ page, params }) => {
  recordVideo(page);

  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const testMonitor1 = 'Test monitor 1';
  const testMonitor2 = 'Test monitor 2';
  const testMonitor3 = 'Test monitor 3';

  before(async () => {
    await enableMonitorManagedViaApi(params.kibanaUrl);
    await cleanTestMonitors(params);

    await addTestMonitor(params.kibanaUrl, testMonitor1);
    await addTestMonitor(params.kibanaUrl, testMonitor2);
    await addTestMonitor(params.kibanaUrl, testMonitor3);
  });

  after(async () => {
    await cleanTestMonitors(params);
  });

  step('Go to monitor-management', async () => {
    await syntheticsApp.navigateToMonitorManagement();
  });

  step('login to Kibana', async () => {
    await syntheticsApp.loginToKibana();
    const invalid = await page.locator(`text=Username or password is incorrect. Please try again.`);
    expect(await invalid.isVisible()).toBeFalsy();
  });

  step('go to monitor', async () => {
    await page.click('text=' + testMonitor1);
  });

  step('shows recently viewed monitors', async () => {
    await page.waitForSelector(byTestId('monitorNameTitle'));
    expect(await page.locator(byTestId('monitorNameTitle')).textContent()).toBe(testMonitor1);
    await page.click('[aria-label="Select a different monitor to view its details"]');
    await page.click('text=' + testMonitor2);

    await page.click('[aria-label="Select a different monitor to view its details"]');
    await page.click('text=Recently viewed');
    await page.click('text=Other monitors');
    await page.click('text=' + testMonitor3);

    await page.click('[aria-label="Select a different monitor to view its details"]');
    await page.click('[placeholder="Monitor name or tag"]');
    await page.fill('[placeholder="Monitor name or tag"]', '2');
    await page.click('text=' + testMonitor2);

    await page.click('[aria-label="Select a different monitor to view its details"]');
  });
});
