/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { before, after, expect, journey, step } from '@elastic/synthetics';
import { RetryService } from '@kbn/ftr-common-functional-services';
import { recordVideo } from '../../helpers/record_video';
import {
  addTestMonitor,
  cleanTestMonitors,
  enableMonitorManagedViaApi,
} from './services/add_monitor';
import { syntheticsAppPageProvider } from '../page_objects/synthetics_app';

journey('OverviewScrolling', async ({ page, params }) => {
  recordVideo(page);

  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const retry: RetryService = params.getService('retry');

  const listOfRequests: string[] = [];
  const expected = [
    'http://localhost:5620/internal/synthetics/service/enablement',
    'http://localhost:5620/internal/synthetics/monitor/filters',
    'http://localhost:5620/internal/uptime/service/locations',
    'http://localhost:5620/internal/synthetics/overview?sortField=status&sortOrder=asc&',
    'http://localhost:5620/internal/synthetics/overview_status?&scopeStatusByLocation=true',
    'http://localhost:5620/internal/synthetics/service/monitors?perPage=10&page=1&sortOrder=asc&sortField=name.keyword&',
    'http://localhost:5620/internal/synthetics/enable_default_alerting',
  ];

  before(async () => {
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/internal/synthetics/') || url.includes('/internal/uptime/')) {
        listOfRequests.push(request.url());
      }
    });
    await enableMonitorManagedViaApi(params.kibanaUrl);
    await cleanTestMonitors(params);

    const allPromises = [];
    for (let i = 0; i < 100; i++) {
      allPromises.push(addTestMonitor(params.kibanaUrl, `test monitor ${i}`));
    }
    await Promise.all(allPromises);

    await syntheticsApp.waitForLoadingToFinish();
  });

  after(async () => {
    await cleanTestMonitors(params);
  });

  step('Go to overview', async () => {
    await syntheticsApp.navigateToOverview();
  });

  step('login to Kibana', async () => {
    await syntheticsApp.loginToKibana();
    const invalid = await page.locator(`text=Username or password is incorrect. Please try again.`);
    expect(await invalid.isVisible()).toBeFalsy();
  });

  step('validates de-duplicate requests', async () => {
    await page.waitForSelector(`text="test monitor 0"`);

    const assertUnique = (value: string) => {
      expect(listOfRequests.filter((req) => req.includes(value)).length).toBe(1);
    };
    assertUnique('/overview_status');
    assertUnique('/overview?');
    assertUnique('/service/monitors');
    assertUnique('/monitor/filters');

    expect(listOfRequests).toEqual(expected);
  });

  step('scroll until you see showing all monitors', async () => {
    const gridItems = await page.locator(`[data-test-subj="syntheticsOverviewGridItem"]`);
    await page.waitForSelector(`text="test monitor 0"`);
    let count = await gridItems.count();

    expect(count <= 32).toBe(true);

    await retry.tryForTime(90 * 1000, async () => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const showingAllMonitorsNode = await page.$(`text="Showing all monitors"`);
      expect(showingAllMonitorsNode).toBeTruthy();
      expect(await showingAllMonitorsNode?.isVisible()).toBe(true);
    });

    count = await gridItems.count();
    expect(count).toBe(100);
  });
});
