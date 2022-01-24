/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before, Page } from '@elastic/synthetics';
import { monitorManagementPageProvider } from '../page_objects/monitor_management';

journey('MonitorManagement', async ({ page, params }: { page: Page; params: any }) => {
  const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const basicMonitorDetails = {
    name: 'Sample monitor',
    location: 'US Central',
    schedule: '@every 3m',
    apmServiceName: 'service',
  };

  const deleteMonitor = async () => {
    const isSuccessful = await uptime.deleteMonitor();
    expect(isSuccessful).toBeTruthy();
  };

  before(async () => {
    await uptime.waitForLoadingToFinish();
  });

  step('Go to monitor-management', async () => {
    await uptime.navigateToMonitorManagement();
  });

  step('login to Kibana', async () => {
    await uptime.loginToKibana();
  });

  step('create monitor http monitor', async () => {
    const monitorDetails = {
      ...basicMonitorDetails,
      url: 'https://elastic.co',
      locations: [basicMonitorDetails.location],
    };
    await uptime.clickAddMonitor();
    await uptime.createBasicHTTPMonitorDetails(monitorDetails);
    const isSuccessful = await uptime.confirmAndSave();
    expect(isSuccessful).toBeTruthy();
  });

  step('view HTTP details in monitor management UI', async () => {
    const monitorDetails = {
      ...basicMonitorDetails,
      url: 'https://elastic.co',
    };
    await uptime.clickAddMonitor();
    await uptime.findMonitorConfiguration(monitorDetails);
  });

  step('delete http monitor', async () => {
    await deleteMonitor();
  });

  step('create monitor tcp monitor', async () => {
    const monitorDetails = {
      ...basicMonitorDetails,
      host: 'smtp.gmail.com:587',
      locations: [basicMonitorDetails.location],
    };
    await uptime.clickAddMonitor();
    await uptime.createBasicTCPMonitorDetails(monitorDetails);
    const isSuccessful = await uptime.confirmAndSave();
    expect(isSuccessful).toBeTruthy();
  });

  step('view TCP details in monitor management UI', async () => {
    const monitorDetails = {
      ...basicMonitorDetails,
      host: 'smtp.gmail.com:587',
    };
    await uptime.clickAddMonitor();
    await uptime.findMonitorConfiguration(monitorDetails);
  });

  step('delete tcp monitor', async () => {
    await deleteMonitor();
  });

  step('create basic ICMP monitor', async () => {
    const monitorDetails = {
      ...basicMonitorDetails,
      host: '1.1.1.1',
      locations: [basicMonitorDetails.location],
    };
    await uptime.clickAddMonitor();
    await uptime.createBasicICMPMonitorDetails(monitorDetails);
    const isSuccessful = await uptime.confirmAndSave();
    expect(isSuccessful).toBeTruthy();
  });

  step('view ICMP details in monitor management UI', async () => {
    const monitorDetails = {
      ...basicMonitorDetails,
      host: '1.1.1.1',
    };
    await uptime.clickAddMonitor();
    await uptime.findMonitorConfiguration(monitorDetails);
  });

  step('delete ICMP monitor', async () => {
    await deleteMonitor();
  });

  step('create basic Browser monitor', async () => {
    const monitorDetails = {
      ...basicMonitorDetails,
      inlineScript: 'step("test step", () => {})',
      locations: [basicMonitorDetails.location],
    };
    await uptime.clickAddMonitor();
    await uptime.createBasicBrowserMonitorDetails(monitorDetails, true);
    const isSuccessful = await uptime.confirmAndSave();
    expect(isSuccessful).toBeTruthy();
  });

  step('view ICMP details in monitor management UI', async () => {
    const monitorDetails = {
      ...basicMonitorDetails,
      host: '1.1.1.1',
    };
    await uptime.clickAddMonitor();
    await uptime.findMonitorConfiguration(monitorDetails);
  });

  step('delete ICMP monitor', async () => {
    await deleteMonitor();
  });
});

journey('Monitor Management breadcrumbs', async ({ page, params }: { page: Page; params: any }) => {
  const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const basicMonitorDetails = {
    name: 'Sample monitor',
    location: 'US Central',
    schedule: '@every 3m',
    apmServiceName: 'service',
  };

  before(async () => {
    await uptime.waitForLoadingToFinish();
  });

  step('Go to monitor-management', async () => {
    await uptime.navigateToMonitorManagement();
  });

  step('login to Kibana', async () => {
    await uptime.loginToKibana();
  });

  step('Check breadcrumb', async () => {
    const lastBreadcrumb = await (await uptime.findByTestSubj('"breadcrumb last"')).textContent();
    expect(lastBreadcrumb).toEqual('Monitor management');
  });

  step('check breadcrumbs', async () => {
    await uptime.clickAddMonitor();
    const breadcrumbs = await page.$$('[data-test-subj="breadcrumb"]');
    expect(await breadcrumbs[1].textContent()).toEqual('Monitor management');
    const lastBreadcrumb = await (await uptime.findByTestSubj('"breadcrumb last"')).textContent();
    expect(lastBreadcrumb).toEqual('Add monitor');
  });

  step('create monitor http monitor', async () => {
    const monitorDetails = {
      ...basicMonitorDetails,
      url: 'https://elastic.co',
      locations: [basicMonitorDetails.location],
    };
    await uptime.createBasicHTTPMonitorDetails(monitorDetails);
    const isSuccessful = await uptime.confirmAndSave();
    expect(isSuccessful).toBeTruthy();
  });

  step('edit http monitor and check breadcrumb', async () => {
    await uptime.editMonitor();
    const breadcrumbs = await page.$$('[data-test-subj=breadcrumb]');
    expect(await breadcrumbs[1].textContent()).toEqual('Monitor management');
    const lastBreadcrumb = await (await uptime.findByTestSubj('"breadcrumb last"')).textContent();
    expect(lastBreadcrumb).toEqual('Edit monitor');
  });

  step('delete monitor', async () => {
    await uptime.navigateToMonitorManagement();
    const isSuccessful = await uptime.deleteMonitor();
    expect(isSuccessful).toBeTruthy();
  });
});
