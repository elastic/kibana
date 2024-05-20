/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before } from '@elastic/synthetics';
import { recordVideo } from '../helpers/record_video';
import { UXDashboardDatePicker } from '../page_objects/date_picker';
import { byTestId, loginToKibana, waitForLoadingToFinish } from './utils';

const jsErrorCount = '3 k';
const jsErrorLabel = `Total errors

${jsErrorCount}`;

journey('UX JsErrors', async ({ page, params }) => {
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

  step('Confirm error count', async () => {
    // Wait until chart data is loaded
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');
    await page.waitForSelector(`text=${jsErrorCount}`);

    const jsErrors = await (await page.waitForSelector(byTestId('uxJsErrorsTotal'))).innerText();

    expect(jsErrors).toBe(jsErrorLabel);
  });
});
