/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before, Page } from '@elastic/synthetics';
import { monitorManagementPageProvider } from '../page_objects/monitor_management';

journey('Monitor Management', async ({ page, params }: { page: Page; params: any }) => {
  const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const httpName = 'http monitor';
  const icmpName = 'icmp monitor';
  const tcpName = 'tcp monitor';
  const browserName = 'browser monitor';

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
    const invalid = await page.locator(`text=Username or password is incorrect. Please try again.`);
    expect(await invalid.isVisible()).toBeFalsy();
  });

  step('create monitor http monitor', async () => {
    const monitorDetails = {
      ...basicMonitorDetails,
      name: httpName,
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
      name: httpName,
      url: 'https://elastic.co',
    };
    await uptime.clickAddMonitor();
    await uptime.findMonitorConfiguration(monitorDetails);
  });

  step('view results in overview page', async () => {
    await uptime.navigateToOverviewPage();
    await page.waitForSelector(`text=${httpName}`, { timeout: 120 * 1000 });
  });

  step('delete http monitor', async () => {
    await uptime.navigateToMonitorManagement();
    await deleteMonitor();
  });

  step('create monitor tcp monitor', async () => {
    const monitorDetails = {
      ...basicMonitorDetails,
      name: tcpName,
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
      name: tcpName,
      host: 'smtp.gmail.com:587',
    };
    await uptime.clickAddMonitor();
    await uptime.findMonitorConfiguration(monitorDetails);
  });

  step('view results in overview page', async () => {
    await uptime.navigateToOverviewPage();
    await page.waitForSelector(`text=${tcpName}`, { timeout: 120 * 1000 });
  });

  step('delete tcp monitor', async () => {
    await uptime.navigateToMonitorManagement();
    await deleteMonitor();
  });

  step('create basic ICMP monitor', async () => {
    const monitorDetails = {
      ...basicMonitorDetails,
      name: icmpName,
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
      name: icmpName,
      host: '1.1.1.1',
    };
    await uptime.clickAddMonitor();
    await uptime.findMonitorConfiguration(monitorDetails);
  });

  step('view results in overview page', async () => {
    await uptime.navigateToOverviewPage();
    await page.waitForSelector(`text=${icmpName}`, { timeout: 120 * 1000 });
  });

  step('delete ICMP monitor', async () => {
    await uptime.navigateToMonitorManagement();
    await deleteMonitor();
  });

  step('create basic Browser monitor', async () => {
    const monitorDetails = {
      ...basicMonitorDetails,
      name: browserName,
      inlineScript: 'step("test step", () => {})',
      locations: [basicMonitorDetails.location],
    };
    await uptime.clickAddMonitor();
    await uptime.createBasicBrowserMonitorDetails(monitorDetails, true);
    const isSuccessful = await uptime.confirmAndSave();
    expect(isSuccessful).toBeTruthy();
  });

  step('view browser details in monitor management UI', async () => {
    const monitorDetails = {
      ...basicMonitorDetails,
      name: browserName,
      host: '1.1.1.1',
    };
    await uptime.clickAddMonitor();
    await uptime.findMonitorConfiguration(monitorDetails);
  });

  step('view results in overview page', async () => {
    await uptime.navigateToOverviewPage();
    await page.waitForSelector(`text=${browserName} - inline`, { timeout: 120 * 1000 });
  });

  step('delete browser monitor', async () => {
    await uptime.navigateToMonitorManagement();
    await deleteMonitor();
  });
});
