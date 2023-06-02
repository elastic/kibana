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

const totalPageLoadValue = '4.24 s';
const totalPageLoadLabel = `Total

${totalPageLoadValue}`;
const backendLabel = `Backend

359 ms`;
const frontendLabel = `Frontend

3.88 s`;
const pageViewsLabel = `Total page views

524`;

journey('UX ClientMetrics', async ({ page, params }) => {
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
    page.waitForLoadState('networkidle');
    await page.waitForSelector(`text=${totalPageLoadValue}`);

    const totalPageLoad = await (
      await page.waitForSelector(byTestId('uxClientMetrics-totalPageLoad'))
    ).innerText();
    const backend = await (
      await page.waitForSelector(byTestId('uxClientMetrics-backend'))
    ).innerText();
    const frontend = await (
      await page.waitForSelector(byTestId('uxClientMetrics-frontend'))
    ).innerText();
    const pageViews = await (
      await page.waitForSelector(byTestId('uxClientMetrics-pageViews'))
    ).innerText();

    expect(totalPageLoad).toBe(totalPageLoadLabel);
    expect(backend).toBe(backendLabel);
    expect(frontend).toBe(frontendLabel);
    expect(pageViews).toBe(pageViewsLabel);
  });
});
