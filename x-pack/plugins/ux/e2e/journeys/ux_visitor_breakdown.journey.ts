/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before } from '@elastic/synthetics';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { UXDashboardDatePicker } from '../page_objects/date_picker';
import { byLensTestId, loginToKibana, waitForLoadingToFinish } from './utils';

const osNameMetric = 'ux-visitor-breakdown-user_agent-os-name';
const uaNameMetric = 'ux-visitor-breakdown-user_agent-name';

const chartIds = [osNameMetric, uaNameMetric];

journey('UX Visitor Breakdown', async ({ page, params }) => {
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
      user: { username: 'elastic', password: 'changeme' },
    });
  });

  step('Set date range', async () => {
    const datePickerPage = new UXDashboardDatePicker(page);
    await datePickerPage.setDefaultE2eRange();
  });

  step('Confirm charts are visible', async () => {
    // Wait until chart data is loaded
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState('networkidle');
    await waitForLoadingToFinish({ page });

    await Promise.all(
      chartIds.map(
        async (dataTestId) =>
          // lens embeddable injects its own test attribute
          await page.waitForSelector(byLensTestId(dataTestId))
      )
    );
  });
});
