/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before, Page } from '@elastic/synthetics';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { syntheticsAppPageProvider } from '../../page_objects/synthetics/synthetics_app';
import { cleanTestMonitors } from './services/add_monitor';

journey(`Getting Started Page`, async ({ page, params }: { page: Page; params: any }) => {
  recordVideo(page);

  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });

  const createBasicMonitor = async () => {
    await syntheticsApp.fillFirstMonitorDetails({
      url: 'https://www.elastic.co',
      locations: ['us_central'],
    });
  };

  before(async () => {
    await cleanTestMonitors(params);
    await syntheticsApp.waitForLoadingToFinish();
  });

  step('Go to monitor-management', async () => {
    await syntheticsApp.navigateToMonitorManagement();
  });

  step('login to Kibana', async () => {
    await syntheticsApp.loginToKibana();
    const invalid = await page.locator(`text=Username or password is incorrect. Please try again.`);
    expect(await invalid.isVisible()).toBeFalsy();
  });

  step('enable monitor management', async () => {
    await syntheticsApp.enableMonitorManagement(true);
  });

  step('shows validation error on submit', async () => {
    await page.click('text=Create monitor');

    expect(await page.isVisible('text=URL is required')).toBeTruthy();
  });

  step('create basic monitor', async () => {
    await createBasicMonitor();
    await syntheticsApp.confirmAndSave();
  });
});
