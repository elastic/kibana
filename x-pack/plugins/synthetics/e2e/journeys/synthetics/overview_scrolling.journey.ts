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
import { syntheticsAppPageProvider } from '../../page_objects/synthetics/synthetics_app';

journey('OverviewScrolling', async ({ page, params }) => {
  recordVideo(page);

  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const retry: RetryService = params.getService('retry');

  before(async () => {
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
