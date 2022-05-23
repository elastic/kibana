/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before, Page } from '@elastic/synthetics';
import { syntheticsAppPageProvider } from '../../page_objects/synthetics_app';
import { byTestId } from '../utils';

journey(`Getting Started Page`, async ({ page, params }: { page: Page; params: any }) => {
  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });

  const createBasicMonitor = async () => {
    await syntheticsApp.fillFirstMonitorDetails({
      url: 'https://www.elastic.co',
      locations: ['us_central'],
      apmServiceName: 'synthetics',
    });
  };

  before(async () => {
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

  step('shows validation error on touch', async () => {
    await page.click(byTestId('urls-input'));
    await page.click(byTestId('comboBoxInput'));
    expect(await page.isVisible('text=URL is required')).toBeTruthy();
  });

  step('create basic monitor', async () => {
    await createBasicMonitor();
    await syntheticsApp.confirmAndSave();
  });

  step('it navigates to details page after saving', async () => {
    await page.click('text=Dismiss');
    expect(await page.isVisible('text=My first monitor')).toBeTruthy();
  });
});
