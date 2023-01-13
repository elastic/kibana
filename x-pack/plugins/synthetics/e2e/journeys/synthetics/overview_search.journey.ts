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
  const testMonitor1 = 'Elastic journey';
  const testMonitor2 = 'CNN journey';
  const testMonitor3 = 'Google journey';
  const testMonitor4 = 'Gmail journey';

  const elastic = page.locator(`text=${testMonitor1}`);
  const cnn = page.locator(`text=${testMonitor2}`);
  const google = page.locator(`text=${testMonitor3}`);
  const gmail = page.locator(`text=${testMonitor4}`);

  before(async () => {
    await enableMonitorManagedViaApi(params.kibanaUrl);
    await cleanTestMonitors(params);

    await addTestMonitor(params.kibanaUrl, testMonitor1, {
      type: 'browser',
      tags: ['tag', 'dev'],
      project_id: 'test-project',
    });
    await addTestMonitor(params.kibanaUrl, testMonitor2, {
      type: 'http',
      tags: ['tag', 'qa'],
      urls: 'https://github.com',
    });
    await addTestMonitor(params.kibanaUrl, testMonitor3, {
      type: 'tcp',
      tags: ['tag', 'staging'],
      hosts: 'smtp',
    });
    await addTestMonitor(params.kibanaUrl, testMonitor4, {
      type: 'icmp',
      tags: ['tag', 'prod'],
      hosts: '1.1.1.1',
    });

    await syntheticsApp.waitForLoadingToFinish();
  });

  step('Go to monitor-management', async () => {
    await syntheticsApp.navigateToOverview();
  });

  step('login to Kibana', async () => {
    await syntheticsApp.loginToKibana();
    const invalid = await page.locator(`text=Username or password is incorrect. Please try again.`);
    expect(await invalid.isVisible()).toBeFalsy();
  });

  step('searches by name', async () => {
    await page.waitForSelector(`[data-test-subj="syntheticsOverviewGridItem"]`);
    await page.waitForSelector(`text=${testMonitor1}`);
    await page.waitForSelector(`text=${testMonitor2}`);
    await page.waitForSelector(`text=${testMonitor3}`);
    await page.focus('[data-test-subj="syntheticsOverviewSearchInput"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'Elastic', { delay: 300 });
    await page.waitForSelector(`text=${testMonitor1}`);
    expect(await elastic.count()).toBe(1);
    expect(await cnn.count()).toBe(0);
    expect(await google.count()).toBe(0);
    await page.click('[aria-label="Clear input"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'cnn', { delay: 300 });
    await page.waitForSelector(`text=${testMonitor2}`);
    expect(await elastic.count()).toBe(0);
    expect(await cnn.count()).toBe(1);
    expect(await google.count()).toBe(0);
    await page.click('[aria-label="Clear input"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'GOOGLE', { delay: 300 });
    await page.waitForSelector(`text=${testMonitor3}`);
    expect(await elastic.count()).toBe(0);
    expect(await cnn.count()).toBe(0);
    expect(await google.count()).toBe(1);
    await page.click('[aria-label="Clear input"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'Journey', { delay: 300 });
    await page.waitForSelector(`text=${testMonitor1}`);
    expect(await elastic.count()).toBe(1);
    expect(await cnn.count()).toBe(1);
    expect(await google.count()).toBe(1);
  });

  step('searches by tags', async () => {
    await page.waitForSelector(`[data-test-subj="syntheticsOverviewGridItem"]`);
    await page.waitForSelector(`text=${testMonitor1}`);
    await page.waitForSelector(`text=${testMonitor2}`);
    await page.waitForSelector(`text=${testMonitor3}`);
    await page.click('[aria-label="Clear input"]');
    await page.focus('[data-test-subj="syntheticsOverviewSearchInput"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'dev', { delay: 300 });
    await page.waitForSelector(`text=${testMonitor1}`);
    expect(await elastic.count()).toBe(1);
    expect(await cnn.count()).toBe(0);
    expect(await google.count()).toBe(0);
    await page.click('[aria-label="Clear input"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'qa', { delay: 300 });
    await page.waitForSelector(`text=${testMonitor2}`);
    expect(await elastic.count()).toBe(0);
    expect(await cnn.count()).toBe(1);
    expect(await google.count()).toBe(0);
    await page.click('[aria-label="Clear input"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'staging', { delay: 300 });
    await page.waitForSelector(`text=${testMonitor3}`);
    expect(await elastic.count()).toBe(0);
    expect(await cnn.count()).toBe(0);
    expect(await google.count()).toBe(1);
    await page.click('[aria-label="Clear input"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'prod', {
      delay: 300,
    });
    await page.waitForSelector(`text=${testMonitor4}`);
    expect(await elastic.count()).toBe(0);
    expect(await cnn.count()).toBe(0);
    expect(await google.count()).toBe(0);
    expect(await gmail.count()).toBe(1);
    await page.click('[aria-label="Clear input"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'tag', {
      delay: 300,
    });
    await page.waitForSelector(`text=${testMonitor1}`);
    expect(await elastic.count()).toBe(1);
    expect(await cnn.count()).toBe(1);
    expect(await google.count()).toBe(1);
    expect(await gmail.count()).toBe(1);
  });

  step('searches by url and host', async () => {
    await page.waitForSelector(`[data-test-subj="syntheticsOverviewGridItem"]`);
    await page.waitForSelector(`text=${testMonitor1}`);
    await page.waitForSelector(`text=${testMonitor2}`);
    await page.waitForSelector(`text=${testMonitor3}`);
    await page.click('[aria-label="Clear input"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'github', { delay: 300 });
    await page.waitForSelector(`text=${testMonitor2}`);
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
    await page.waitForSelector(`text=${testMonitor1}`);
    await page.waitForSelector(`text=${testMonitor2}`);
    await page.waitForSelector(`text=${testMonitor3}`);
    await page.focus('[data-test-subj="syntheticsOverviewSearchInput"]');
    await page.type('[data-test-subj="syntheticsOverviewSearchInput"]', 'project', { delay: 300 });
    await page.waitForSelector(`text=${testMonitor1}`);
    expect(await elastic.count()).toBe(1);
    expect(await cnn.count()).toBe(0);
    expect(await google.count()).toBe(0);
  });
});
