/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuid from 'uuid';
import { journey, step, expect, after, before, Page } from '@elastic/synthetics';
import { monitorManagementPageProvider } from '../page_objects/monitor_management';

journey('MonitorDetails', async ({ page, params }: { page: Page; params: any }) => {
  const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const name = `Test monitor ${uuid.v4()}`;

  before(async () => {
    await uptime.waitForLoadingToFinish();
  });

  after(async () => {
    await uptime.enableMonitorManagement(false);
  });

  step('Go to monitor-management', async () => {
    await uptime.navigateToMonitorManagement();
  });

  step('login to Kibana', async () => {
    await uptime.loginToKibana();
    const invalid = await page.locator(`text=Username or password is incorrect. Please try again.`);
    expect(await invalid.isVisible()).toBeFalsy();
  });

  step('create basic monitor', async () => {
    await uptime.enableMonitorManagement();
    await uptime.clickAddMonitor();
    await uptime.createBasicMonitorDetails({
      name,
      locations: ['US Central'],
      apmServiceName: 'synthetics',
    });
    await uptime.fillByTestSubj('syntheticsUrlField', 'https://www.google.com');
    await uptime.confirmAndSave();
  });

  step('navigate to monitor details page', async () => {
    await uptime.assertText({ text: name });
    await Promise.all([page.waitForNavigation(), page.click(`text=${name}`)]);
    await uptime.assertText({ text: name });
    const url = await page.textContent('[data-test-subj="monitor-page-url"]');
    const type = await page.textContent('[data-test-subj="monitor-page-type"]');
    expect(url).toEqual('https://www.google.com(opens in a new tab or window)');
    expect(type).toEqual('HTTP');
  });

  step('delete monitor', async () => {
    await uptime.navigateToMonitorManagement();
    const isSuccessful = await uptime.deleteMonitors();
    expect(isSuccessful).toBeTruthy();
  });
});
