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
import { journey, step, expect, before, Page } from '@elastic/synthetics';
import { monitorManagementPageProvider } from '../page_objects/monitor_management';
import { byTestId } from './utils';

journey(`MonitorName`, async ({ page, params }: { page: Page; params: any }) => {
  const name = `Test monitor ${uuid.v4()}`;
  const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });

  const createBasicMonitor = async () => {
    await uptime.createBasicMonitorDetails({
      name,
      locations: ['US Central'],
      apmServiceName: 'synthetics',
    });
    await uptime.fillByTestSubj('syntheticsUrlField', 'https://www.google.com');
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

  step('create basic monitor', async () => {
    await uptime.enableMonitorManagement();
    await uptime.clickAddMonitor();
    await createBasicMonitor();
    await uptime.confirmAndSave();
  });

  step(`shows error if name already exists`, async () => {
    await uptime.navigateToAddMonitor();
    await uptime.createBasicMonitorDetails({
      name,
      locations: ['US Central'],
      apmServiceName: 'synthetics',
    });
    await uptime.fillByTestSubj('syntheticsUrlField', 'https://www.google.com');

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
