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

journey(`MonitorManagementList`, async ({ page, params }) => {
  recordVideo(page);

  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const testMonitor1 = 'Test monitor 1';
  const testMonitor2 = 'Test monitor 2';
  const testMonitor3 = 'Test monitor 3';

  const pageBaseUrl = 'http://localhost:5620/app/synthetics/monitors';
  const searchBarInput = page.locator(
    '[placeholder="Search by name, URL, host, tag, project or location"]'
  );

  page.setDefaultTimeout(60 * 1000);

  before(async () => {
    await enableMonitorManagedViaApi(params.kibanaUrl);
    await cleanTestMonitors(params);

    await addTestMonitor(params.kibanaUrl, testMonitor1);
    await addTestMonitor(params.kibanaUrl, testMonitor2);
    await addTestMonitor(params.kibanaUrl, testMonitor3, {
      type: 'browser',
      schedule: { unit: 'm', number: '5' },
    });
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

  step('shows the count', async () => {
    await page.waitForSelector('text=Monitors');
    await page.waitForSelector('text=1-3');
  });

  step('Click text=Showing 1-3 of 3 Configurations; Page 1', async () => {
    await page.waitForSelector('text=Showing 1-3 of 3 Configurations');
    await page.click('[aria-label="expands filter group for Type filter"]');
  });

  step('Click listbox option >> text="Journey / Page"', async () => {
    // Refactored the aria-label in https://github.com/elastic/eui/pull/6589
    // to an aria-describedby so it would be announced on EuiSelectable focus.
    await page.click('span >> text="Journey / Page"');
    await page.click('[aria-label="Apply the selected filters for Type"]');
    expect(page.url()).toBe(`${pageBaseUrl}?monitorTypes=%5B%22browser%22%5D`);
    await page.click('[placeholder="Search by name, URL, host, tag, project or location"]');
    await Promise.all([
      page.waitForNavigation({
        url: `${pageBaseUrl}?monitorTypes=%5B%22browser%22%5D&query=3`,
      }),
      page.fill('[placeholder="Search by name, URL, host, tag, project or location"]', '3'),
    ]);
    await page.click('text=1-1');
    await page.waitForSelector('text=Showing 1-1 of 1 Configuration');
  });

  step('when no results appears', async () => {
    await searchBarInput.click();
    await searchBarInput.fill('5553');

    await page.waitForSelector('text=0-0');

    // Clear search
    await searchBarInput.press('Escape');
    await page.waitForSelector('text=1-3');
  });

  step('Shows monitor summary', async () => {
    const statSummaryPanel = page.locator(byTestId('syntheticsManagementSummaryStats')); // Summary stat elements
    await expect(statSummaryPanel.locator('text=3').count()).resolves.toEqual(1); // Configurations
    await expect(statSummaryPanel.locator('text=0').count()).resolves.toEqual(1); // Disabled
  });

  step('Filter by Frequency', async () => {
    const frequencyFilter = page.locator('.euiFilterButton__text', { hasText: 'Frequency' });
    const fiveMinuteScheduleOption = page.getByText('Every 5 minutes').first();

    await frequencyFilter.click();
    await fiveMinuteScheduleOption.click();
    await page.getByText('Apply').click();

    // There should be only 1 monitor with schedule 5 minutes
    await page.waitForSelector('text=1-1');

    // Clear the filter
    await frequencyFilter.click();
    await fiveMinuteScheduleOption.click();
    await page.getByText('Apply').click();
    await page.waitForSelector('text=1-3');
  });
});
