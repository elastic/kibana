/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, journey, step } from '@elastic/synthetics';
import { recordVideo } from '../../helpers/record_video';
import { syntheticsAppPageProvider } from '../page_objects/synthetics_app';

journey('TestMonitorDetailFlyout', async ({ page, params }) => {
  recordVideo(page);

  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const monitorName = 'test-flyout-http-monitor';

  step('Go to monitor-management', async () => {
    await syntheticsApp.navigateToAddMonitor();
  });

  step('login to Kibana', async () => {
    await syntheticsApp.loginToKibana();
    const invalid = await page.locator(`text=Username or password is incorrect. Please try again.`);
    expect(await invalid.isVisible()).toBeFalsy();
  });

  step('create http monitor', async () => {
    await syntheticsApp.createBasicHTTPMonitorDetails({
      name: monitorName,
      url: 'https://www.elastic.co',
      apmServiceName: 'dev',
      locations: ['US Central'],
    });
    expect(await syntheticsApp.confirmAndSave()).toBeTruthy();
  });

  step('open overview flyout', async () => {
    await syntheticsApp.navigateToOverview();
    await syntheticsApp.assertText({ text: monitorName });
    await page.click(`[data-test-subj="${monitorName}-metric-item"]`);
    const flyoutHeader = await page.waitForSelector('.euiFlyoutHeader');
    expect(await flyoutHeader.innerText()).toContain(monitorName);
  });

  step('delete monitors', async () => {
    await syntheticsApp.navigateToMonitorManagement();
    expect(await syntheticsApp.deleteMonitors()).toBeTruthy();
  });
});
