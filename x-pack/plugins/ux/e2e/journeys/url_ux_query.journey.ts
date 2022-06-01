/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before } from '@elastic/synthetics';
import {
  UXDashboardDatePicker,
  DEFAULT_ABS_START_UTC_DATE,
  DEFAULT_ABS_END_UTC_DATE,
} from '../page_objects/date_picker';
import { byTestId, loginToKibana, waitForLoadingToFinish } from './utils';

journey('UX URL Query', async ({ page, params }) => {
  before(async () => {
    await waitForLoadingToFinish({ page });
  });

  const queryParams = {
    percentile: '50',
    rangeFrom: DEFAULT_ABS_START_UTC_DATE,
    rangeTo: DEFAULT_ABS_END_UTC_DATE,
  };
  const queryString = new URLSearchParams(queryParams).toString();

  const baseUrl = `${params.kibanaUrl}/app/ux`;

  step('Go to UX Dashboard', async () => {
    await page.goto(`${baseUrl}?${queryString}`, {
      waitUntil: 'networkidle',
    });
    await loginToKibana({
      page,
      user: { username: 'viewer_user', password: 'changeme' },
    });
  });

  step('Set date range', async () => {
    const datePickerPage = new UXDashboardDatePicker(page);
    await datePickerPage.setDefaultE2eRange();
  });

  step('Confirm query params', async () => {
    const value = await page.$eval(
      byTestId('uxPercentileSelect'),
      (sel: HTMLInputElement) => sel.value
    );

    expect(value).toBe(queryParams.percentile);
  });
});
