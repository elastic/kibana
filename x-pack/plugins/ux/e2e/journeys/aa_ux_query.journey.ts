/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before } from '@elastic/synthetics';
import { UXDashboardDatePicker } from '../page_objects/date_picker';
import { UXDashboardFilters } from '../page_objects/dashboard';
import { loginToKibana, waitForLoadingToFinish } from './utils';

journey('UX URL Query', async ({ page, params }) => {
  const filtersPage = new UXDashboardFilters(page);

  before(async () => {
    await waitForLoadingToFinish({ page });
  });

  const queryParams = {
    percentile: '50',
  };
  const queryString = new URLSearchParams().toString();

  const baseUrl = `${params.kibanaUrl}/app/ux`;

  step('Go to UX Dashboard', async () => {
    await page.goto(`${baseUrl}?${queryString}`, {
      waitUntil: 'networkidle',
    });
    await loginToKibana({
      page,
      user: { username: 'obs_read_user', password: 'changeme' },
    });
  });

  step('Set date range', async () => {
    const datePickerPage = new UXDashboardDatePicker(page);
    await datePickerPage.setDefaultE2eRange();
  });

  step('Confirm query params', async () => {
    const fiftiethPercentile = filtersPage.getPercentileOption('50');
    expect(fiftiethPercentile).toHaveProperty('value', queryParams.percentile);
  });
});
