/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { before, expect, journey, step } from '@elastic/synthetics';
import {
  addTestMonitor,
  cleanTestMonitors,
  enableMonitorManagedViaApi,
} from './services/add_monitor';
import { syntheticsAppPageProvider } from '../page_objects/synthetics_app';

journey('OverviewSorting', async ({ page, params }) => {
  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl, params });
  const testMonitor1 = 'acb'; // second alpha, first created
  const testMonitor2 = 'aCd'; // third alpha, second created
  const testMonitor3 = 'Abc'; // first alpha, last created

  before(async () => {
    await enableMonitorManagedViaApi(params.kibanaUrl);
    await cleanTestMonitors(params);

    await addTestMonitor(params.kibanaUrl, testMonitor1);
    await addTestMonitor(params.kibanaUrl, testMonitor2);
    await addTestMonitor(params.kibanaUrl, testMonitor3);
  });

  step('Go to overview page', async () => {
    await syntheticsApp.navigateToOverview(true, 15);
  });

  step('sort should reload monitor cards', async () => {
    await page.waitForSelector(`[data-test-subj="syntheticsOverviewGridItem"]`);
    await page.click('[data-test-subj="syntheticsOverviewSortButton"]');
    await page.click('button:has-text("Alphabetical")');
    await page.waitForSelector(`text=${testMonitor1}`);
    await page.waitForSelector(`text=${testMonitor2}`);
    await page.waitForSelector(`text=${testMonitor3}`);
  });

  step('sort alphabetical asc', async () => {
    await page.waitForSelector(`[data-test-subj="syntheticsOverviewGridItem"]`);
    await page.click('[data-test-subj="syntheticsOverviewSortButton"]');
    await page.click('button:has-text("Alphabetical")');
    await page.waitForSelector(`text=${testMonitor1}`);
    await page.waitForSelector(`text=${testMonitor2}`);
    await page.waitForSelector(`text=${testMonitor3}`);
    const gridItems = await page.locator(`[data-test-subj="syntheticsOverviewGridItem"]`);
    const first = await gridItems.nth(0);
    const second = await gridItems.nth(1);
    const third = await gridItems.nth(2);
    const correctFirstMonitor = await first.locator(`button:has-text('${testMonitor3}')`);
    const correctSecondMonitor = await second.locator(`button:has-text('${testMonitor1}')`);
    const correctThirdMonitor = await third.locator(`button:has-text('${testMonitor2}')`);
    expect(await correctFirstMonitor.count()).toBe(1);
    expect(await correctSecondMonitor.count()).toBe(1);
    expect(await correctThirdMonitor.count()).toBe(1);
  });

  step('sort alphabetical desc', async () => {
    await page.waitForSelector(`[data-test-subj="syntheticsOverviewGridItem"]`);
    await page.click('[data-test-subj="syntheticsOverviewSortButton"]');
    await page.click('button:has-text("Z -> A")');
    await page.waitForSelector(`text=${testMonitor1}`);
    await page.waitForSelector(`text=${testMonitor2}`);
    await page.waitForSelector(`text=${testMonitor3}`);
    const gridItems = await page.locator(`[data-test-subj="syntheticsOverviewGridItem"]`);
    const first = await gridItems.nth(0);
    const second = await gridItems.nth(1);
    const third = await gridItems.nth(2);
    const correctFirstMonitor = await first.locator(`button:has-text('${testMonitor2}')`);
    const correctSecondMonitor = await second.locator(`button:has-text('${testMonitor1}')`);
    const correctThirdMonitor = await third.locator(`button:has-text('${testMonitor3}')`);
    expect(await correctFirstMonitor.count()).toBe(1);
    expect(await correctSecondMonitor.count()).toBe(1);
    expect(await correctThirdMonitor.count()).toBe(1);
  });

  step('sort last updated asc', async () => {
    await page.waitForSelector(`[data-test-subj="syntheticsOverviewGridItem"]`);
    await page.click('[data-test-subj="syntheticsOverviewSortButton"]');
    await page.click('button:has-text("Last modified")');
    await page.waitForSelector(`text=${testMonitor1}`);
    await page.waitForSelector(`text=${testMonitor2}`);
    await page.waitForSelector(`text=${testMonitor3}`);
    const gridItems = await page.locator(`[data-test-subj="syntheticsOverviewGridItem"]`);
    const first = await gridItems.nth(0);
    const second = await gridItems.nth(1);
    const third = await gridItems.nth(2);
    const correctFirstMonitor = await first.locator(`button:has-text('${testMonitor3}')`);
    const correctSecondMonitor = await second.locator(`button:has-text('${testMonitor2}')`);
    const correctThirdMonitor = await third.locator(`button:has-text('${testMonitor1}')`);
    expect(await correctFirstMonitor.count()).toBe(1);
    expect(await correctSecondMonitor.count()).toBe(1);
    expect(await correctThirdMonitor.count()).toBe(1);
  });

  step('sort last updated desc', async () => {
    await page.waitForSelector(`[data-test-subj="syntheticsOverviewGridItem"]`);
    await page.click('[data-test-subj="syntheticsOverviewSortButton"]');
    await page.click('button:has-text("Oldest first")');
    await page.waitForSelector(`text=${testMonitor1}`);
    await page.waitForSelector(`text=${testMonitor2}`);
    await page.waitForSelector(`text=${testMonitor3}`);
    const gridItems = await page.locator(`[data-test-subj="syntheticsOverviewGridItem"]`);
    const first = await gridItems.nth(0);
    const second = await gridItems.nth(1);
    const third = await gridItems.nth(2);
    const correctFirstMonitor = await first.locator(`button:has-text('${testMonitor1}')`);
    const correctSecondMonitor = await second.locator(`button:has-text('${testMonitor2}')`);
    const correctThirdMonitor = await third.locator(`button:has-text('${testMonitor3}')`);
    expect(await correctFirstMonitor.count()).toBe(1);
    expect(await correctSecondMonitor.count()).toBe(1);
    expect(await correctThirdMonitor.count()).toBe(1);
  });

  step('delete monitors', async () => {
    await syntheticsApp.navigateToMonitorManagement();
    expect(await syntheticsApp.deleteMonitors()).toBeTruthy();
  });
});
