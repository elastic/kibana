/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { journey, step, expect, after, Page } from '@elastic/synthetics';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { monitorManagementPageProvider } from '../../page_objects/uptime/monitor_management';

journey('MonitorDetails', async ({ page, params }: { page: Page; params: any }) => {
  recordVideo(page);

  const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const name = `Test monitor ${uuid.v4()}`;

  after(async () => {
    await uptime.enableMonitorManagement(false);
  });

  step('Go to monitor-management', async () => {
    await uptime.navigateToMonitorManagement(true);
  });

  step('create basic monitor', async () => {
    await uptime.enableMonitorManagement();
    await uptime.clickAddMonitor();
    await uptime.createBasicHTTPMonitorDetails({
      name,
      locations: ['US Central'],
      apmServiceName: 'synthetics',
      url: 'https://www.google.com',
    });
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
