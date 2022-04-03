/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before } from '@elastic/synthetics';
import { loginToKibana, waitForLoadingToFinish } from './utils';

journey('StepsDuration', async ({ page, params }) => {
  before(async () => {
    await waitForLoadingToFinish({ page });
  });

  const queryParams = new URLSearchParams({
    dateRangeStart: '2021-11-21T22:06:06.502Z',
    dateRangeEnd: '2021-11-21T22:10:08.203Z',
  }).toString();

  const baseUrl = `${params.kibanaUrl}/app/uptime`;

  step('Go to uptime', async () => {
    await page.goto(`${baseUrl}?${queryParams}`, {
      waitUntil: 'networkidle',
    });
    await loginToKibana({ page });
  });

  step('Go to monitor details', async () => {
    await page.click('text=Dismiss');
    await page.click('button:has-text("test-monitor - inline")');
    expect(page.url()).toBe(`${baseUrl}/monitor/dGVzdC1tb25pdG9yLWlubGluZQ==/?${queryParams}`);
  });

  step('Go to journey details', async () => {
    await page.click('text=18 seconds');
    expect(page.url()).toBe(`${baseUrl}/journey/9f217c22-4b17-11ec-b976-aa665a54da40/steps`);
  });

  step('Check for monitor duration', async () => {
    await page.hover('text=8.9 sec');
    await page.waitForSelector('text=Explore');
    expect(await page.$('text=Explore')).toBeTruthy();
    await page.waitForSelector('text=area chart');
    expect(await page.$('text=area chart')).toBeTruthy();
  });
});
