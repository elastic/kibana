/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, expect } from '@elastic/synthetics';
import { recordVideo } from '../helpers/record_video';
import { UXDashboardDatePicker } from '../page_objects/date_picker';
import { byTestId, loginToKibana, waitForLoadingToFinish } from './utils';

const longestMetric = 'uxLongestTask';
const countMetric = 'uxLongTaskCount';
const sumMetric = 'uxSumLongTask';

const longestMetricValue = `Longest long task duration

237 ms`;
const countMetricValue = `No. of long tasks

3`;
const sumMetricValue = `Total long tasks duration

428 ms`;

journey('UX LongTaskMetrics', async ({ page, params }) => {
  recordVideo(page);

  before(async () => {
    await waitForLoadingToFinish({ page });
  });

  const queryParams = {
    percentile: '50',
    rangeFrom: '2020-05-18T11:51:00.000Z',
    rangeTo: '2021-10-30T06:37:15.536Z',
  };
  const queryString = new URLSearchParams(queryParams).toString();

  const baseUrl = `${params.kibanaUrl}/app/ux`;

  step('Go to UX Dashboard', async () => {
    await page.goto(`${baseUrl}?${queryString}`, {
      waitUntil: 'networkidle',
    });
    await loginToKibana({
      page,
      user: { username: 'viewer', password: 'changeme' },
    });
  });

  step('Set date range', async () => {
    const datePickerPage = new UXDashboardDatePicker(page);
    await datePickerPage.setDefaultE2eRange();
  });

  step('Confirm metrics values', async () => {
    // Wait until chart data is loaded
    await page.waitForLoadState('networkidle');
    // wait for first metric to be shown
    await page.waitForSelector(`text="237 ms"`);

    let metric = await (await page.waitForSelector(byTestId(longestMetric))).innerText();

    expect(metric).toBe(longestMetricValue);

    metric = await (await page.waitForSelector(byTestId(countMetric))).innerText();

    expect(metric).toBe(countMetricValue);

    metric = await (await page.waitForSelector(byTestId(sumMetric))).innerText();

    expect(metric).toBe(sumMetricValue);
  });
});
