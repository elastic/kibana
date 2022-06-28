/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before } from '@elastic/synthetics';
import { UXDashboardDatePicker } from '../page_objects/date_picker';
import { loginToKibana, waitForLoadingToFinish } from './utils';

journey('Page Views Chart', async ({ page, params }) => {
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

  step('Check Page Views charts', async () => {
    await page.click(
      'text=Total page viewsSelect an option: No breakdown, is selectedNo breakdown >> button'
    );
    await page.click('button[role="option"]:has-text("Browser")');
    // assumption is if these values appear there is data for them within the date range
    expect(await page.waitForSelector('text=Chrome'));
    expect(await page.waitForSelector('text=Chrome Mobile iOS'));
    expect(await page.waitForSelector('text=Edge'));
    expect(await page.waitForSelector('text=Safari'));
    expect(await page.waitForSelector('text=Firefox'));
  });
});
