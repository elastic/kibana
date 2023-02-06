/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { journey, step, expect, Page } from '@elastic/synthetics';
import { byTestId } from '@kbn/observability-plugin/e2e/utils';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { monitorManagementPageProvider } from '../../page_objects/uptime/monitor_management';

journey(`MonitorName`, async ({ page, params }: { page: Page; params: any }) => {
  recordVideo(page);

  const name = `Test monitor ${uuidv4()}`;
  const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });

  const createBasicMonitor = async () => {
    await uptime.createBasicHTTPMonitorDetails({
      name,
      locations: ['US Central'],
      apmServiceName: 'synthetics',
      url: 'https://www.google.com',
    });
  };

  step('Go to monitor-management', async () => {
    await uptime.navigateToMonitorManagement(true);
  });

  step('create basic monitor', async () => {
    await uptime.enableMonitorManagement();
    await uptime.clickAddMonitor();
    await createBasicMonitor();
    await uptime.confirmAndSave();
  });

  step(`shows error if name already exists`, async () => {
    await uptime.navigateToAddMonitor();
    await uptime.createBasicHTTPMonitorDetails({
      name,
      locations: ['US Central'],
      apmServiceName: 'synthetics',
      url: 'https://www.google.com',
    });

    await uptime.assertText({ text: 'Monitor name already exists.' });

    expect(await page.isEnabled(byTestId('monitorTestNowRunBtn'))).toBeFalsy();
  });

  step(`form becomes valid after change`, async () => {
    await uptime.createBasicMonitorDetails({
      name: 'Test monitor 2',
      locations: ['US Central'],
      apmServiceName: 'synthetics',
    });

    expect(await page.isEnabled(byTestId('monitorTestNowRunBtn'))).toBeTruthy();
  });

  step('delete monitor', async () => {
    await uptime.navigateToMonitorManagement();
    await uptime.deleteMonitors();
    await uptime.enableMonitorManagement(false);
  });
});
