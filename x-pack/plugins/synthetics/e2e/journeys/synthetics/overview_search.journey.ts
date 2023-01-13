/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { before, expect, journey, step } from '@elastic/synthetics';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import {
  addTestMonitor,
  cleanTestMonitors,
  enableMonitorManagedViaApi,
} from './services/add_monitor';
import { syntheticsAppPageProvider } from '../../page_objects/synthetics/synthetics_app';

journey('Overview Search', async ({ page, params }) => {
  recordVideo(page);

  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const elasticJourney = 'Elastic journey';
  const cnnJourney = 'CNN journey';
  const googleJourney = 'Google journey';
  const gmailJourney = 'Gmail journey';

  const elastic = page.locator(`text=${elasticJourney}`);
  const cnn = page.locator(`text=${cnnJourney}`);
  const google = page.locator(`text=${googleJourney}`);
  const gmail = page.locator(`text=${gmailJourney}`);

  before(async () => {
    await enableMonitorManagedViaApi(params.kibanaUrl);
    await cleanTestMonitors(params);

    await addTestMonitor(params.kibanaUrl, elasticJourney, {
      type: 'browser',
      tags: ['tag', 'dev'],
      project_id: 'test-project',
    });
    await addTestMonitor(params.kibanaUrl, cnnJourney, {
      type: 'http',
      tags: ['tag', 'qa'],
      urls: 'https://github.com',
    });
    await addTestMonitor(params.kibanaUrl, googleJourney, {
      type: 'tcp',
      tags: ['tag', 'staging'],
      hosts: 'smtp',
    });
    await addTestMonitor(params.kibanaUrl, gmailJourney, {
      type: 'icmp',
      tags: ['tag', 'prod'],
      hosts: '1.1.1.1',
    });

    await syntheticsApp.waitForLoadingToFinish();
  });

  step('Go to monitor-management', async () => {
    await syntheticsApp.navigateToOverview(true);
  });

  step('searches by name', async () => {
    await page.waitForSelector(`[data-test-subj="syntheticsOverviewGridItem"]`);
    await page.waitForSelector(`text=${elasticJourney}`);
    await page.waitForSelector(`text=${cnnJourney}`);
    await page.waitForSelector(`text=${googleJourney}`);
    await page.focus('[data-test-subj="syntheticsOverviewSearchInput"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'Elastic', { delay: 200 });
    await page.waitForSelector(`text=${elasticJourney}`);
    expect(await elastic.count()).toBe(1);
    expect(await cnn.count()).toBe(0);
    expect(await google.count()).toBe(0);
    await page.click('[aria-label="Clear input"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'cnn', { delay: 200 });
    await page.waitForSelector(`text=${cnnJourney}`);
    expect(await elastic.count()).toBe(0);
    expect(await cnn.count()).toBe(1);
    expect(await google.count()).toBe(0);
    await page.click('[aria-label="Clear input"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'GOOGLE', { delay: 200 });
    await page.waitForSelector(`text=${googleJourney}`);
    expect(await elastic.count()).toBe(0);
    expect(await cnn.count()).toBe(0);
    expect(await google.count()).toBe(1);
    await page.click('[aria-label="Clear input"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'Journey', { delay: 200 });
    await page.waitForSelector(`text=${elasticJourney}`);
    await page.waitForSelector(`text=${cnnJourney}`);
    await page.waitForSelector(`text=${googleJourney}`);
    expect(await elastic.count()).toBe(1);
    expect(await cnn.count()).toBe(1);
    expect(await google.count()).toBe(1);
  });

  step('searches by tags', async () => {
    await page.waitForSelector(`[data-test-subj="syntheticsOverviewGridItem"]`);
    await page.waitForSelector(`text=${elasticJourney}`);
    await page.waitForSelector(`text=${cnnJourney}`);
    await page.waitForSelector(`text=${googleJourney}`);
    await page.click('[aria-label="Clear input"]');
    await page.focus('[data-test-subj="syntheticsOverviewSearchInput"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'dev', { delay: 200 });
    await page.waitForSelector(`text=${elasticJourney}`);
    expect(await elastic.count()).toBe(1);
    expect(await cnn.count()).toBe(0);
    expect(await google.count()).toBe(0);
    await page.click('[aria-label="Clear input"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'qa', { delay: 200 });
    await page.waitForSelector(`text=${cnnJourney}`);
    expect(await elastic.count()).toBe(0);
    expect(await cnn.count()).toBe(1);
    expect(await google.count()).toBe(0);
    await page.click('[aria-label="Clear input"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'staging', { delay: 200 });
    await page.waitForSelector(`text=${googleJourney}`);
    expect(await elastic.count()).toBe(0);
    expect(await cnn.count()).toBe(0);
    expect(await google.count()).toBe(1);
    await page.click('[aria-label="Clear input"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'prod', {
      delay: 300,
    });
    await page.waitForSelector(`text=${gmailJourney}`);
    expect(await elastic.count()).toBe(0);
    expect(await cnn.count()).toBe(0);
    expect(await google.count()).toBe(0);
    expect(await gmail.count()).toBe(1);
    await page.click('[aria-label="Clear input"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'tag', {
      delay: 300,
    });
    await page.waitForSelector(`text=${elasticJourney}`);
    await page.waitForSelector(`text=${cnnJourney}`);
    await page.waitForSelector(`text=${googleJourney}`);
    await page.waitForSelector(`text=${gmailJourney}`);

    expect(await elastic.count()).toBe(1);
    expect(await cnn.count()).toBe(1);
    expect(await google.count()).toBe(1);
    expect(await gmail.count()).toBe(1);
  });

  step('searches by url and host', async () => {
    await page.waitForSelector(`[data-test-subj="syntheticsOverviewGridItem"]`);
    await page.waitForSelector(`text=${elasticJourney}`);
    await page.waitForSelector(`text=${cnnJourney}`);
    await page.waitForSelector(`text=${googleJourney}`);
    await page.click('[aria-label="Clear input"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'github', { delay: 200 });
    await page.waitForSelector(`text=${cnnJourney}`);
    expect(await elastic.count()).toBe(0);
    expect(await cnn.count()).toBe(1);
    expect(await google.count()).toBe(0);
    // await page.click('[aria-label="Clear input"]');
    // await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'smtp', { delay: 300 });
    // await page.waitForSelector(`text=${testMonitor3}`);
    // expect(await elastic.count()).toBe(0);
    // expect(await cnn.count()).toBe(0);
    // expect(await google.count()).toBe(1);
    // await page.click('[aria-label="Clear input"]');
    // await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', '1.1.1.1', {
    //   delay: 300,
    // });
    // await page.waitForSelector(`text=${testMonitor4}`);
    // expect(await elastic.count()).toBe(0);
    // expect(await cnn.count()).toBe(0);
    // expect(await google.count()).toBe(0);
    // expect(await gmail.count()).toBe(1);
  });

  step('searches by project', async () => {
    await page.click('[aria-label="Clear input"]');
    await page.waitForSelector(`[data-test-subj="syntheticsOverviewGridItem"]`);
    await page.waitForSelector(`text=${elasticJourney}`);
    await page.waitForSelector(`text=${cnnJourney}`);
    await page.waitForSelector(`text=${googleJourney}`);
    await page.focus('[data-test-subj="syntheticsOverviewSearchInput"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'project', { delay: 200 });
    await page.waitForSelector(`text=${elasticJourney}`);
    expect(await elastic.count()).toBe(1);
    expect(await cnn.count()).toBe(0);
    expect(await google.count()).toBe(0);
  });
});
