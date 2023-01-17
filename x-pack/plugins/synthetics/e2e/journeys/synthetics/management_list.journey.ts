/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before, after } from '@elastic/synthetics';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import {
  addTestMonitor,
  cleanTestMonitors,
  enableMonitorManagedViaApi,
} from './services/add_monitor';
import { syntheticsAppPageProvider } from '../../page_objects/synthetics/synthetics_app';

journey(`MonitorManagementList`, async ({ page, params }) => {
  recordVideo(page);

  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const testMonitor1 = 'Test monitor 1';
  const testMonitor2 = 'Test monitor 2';
  const testMonitor3 = 'Test monitor 3';

  page.setDefaultTimeout(60 * 1000);

  before(async () => {
    await enableMonitorManagedViaApi(params.kibanaUrl);
    await cleanTestMonitors(params);

    await addTestMonitor(params.kibanaUrl, testMonitor1);
    await addTestMonitor(params.kibanaUrl, testMonitor2);
    await addTestMonitor(params.kibanaUrl, testMonitor3);
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
    await page.locator('text=Monitors');
    await page.click('text=1-3');
  });

  step(
    'Click text=Showing 1-3 of 3 ConfigurationsSortingThis table contains 3 rows out of 3 rows; Page 1',
    async () => {
      await page.click(
        'text=Showing 1-3 of 3 ConfigurationsSortingThis table contains 3 rows out of 3 rows; Page 1'
      );
      await page.click('[aria-label="expands filter group for Type filter"]');
    }
  );

  step(
    'Click [aria-label="Use up and down arrows to move focus over options. Enter to select. Escape to collapse options."] >> text=browser',
    async () => {
      await page.click(
        '[aria-label="Use up and down arrows to move focus over options. Enter to select. Escape to collapse options."] >> text=browser'
      );
      await page.click('[aria-label="Apply the selected filters for Type"]');
      expect(page.url()).toBe(
        'http://localhost:5620/app/synthetics/monitors?monitorType=%5B%22browser%22%5D'
      );
      await page.click('[placeholder="Search by name, url, host, tag, project or location"]');
      await Promise.all([
        page.waitForNavigation({
          url: 'http://localhost:5620/app/synthetics/monitors?monitorType=%5B%22browser%22%5D&query=3',
        }),
        page.fill('[placeholder="Search by name, url, host, tag, project or location"]', '3'),
      ]);
      await page.click('text=1-1');
      await page.click(
        'text=Showing 1-1 of 1 ConfigurationSortingThis table contains 1 rows out of 1 rows; Page 1 '
      );
    }
  );

  step('when no results appears', async () => {
    await page.click('[placeholder="Search by name, url, host, tag, project or location"]');
    await page.fill('[placeholder="Search by name, url, host, tag, project or location"]', '5553');

    await page.click('text=0-0');
  });
});
