/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before } from '@elastic/synthetics';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { UXDashboardDatePicker } from '../page_objects/date_picker';
import { byTestId, loginToKibana, waitForLoadingToFinish } from './utils';

journey('Page Views Chart', async ({ page, params }) => {
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

  step('Check Page Views charts', async () => {
    await page.waitForLoadState('networkidle');
    await page.click(
      'text=Total page viewsSelect an option: No breakdown, is selectedNo breakdown >> button'
    );
    await page.click('button[role="option"]:has-text("Browser")');
    expect(await page.waitForSelector('text=Chrome'));
    expect(await page.waitForSelector('text=Chrome Mobile iOS'));
    expect(await page.waitForSelector('text=Edge'));
    expect(await page.waitForSelector('text=Safari'));
    expect(await page.waitForSelector('text=Firefox'));
  });

  step('can click through to exploratory view', async () => {
    expect(await page.hover('text=Firefox'));
    await page.click(
      `.pageViewsChart  ${byTestId('embeddablePanelToggleMenuIcon')}`
    );
    await page.click(byTestId('embeddablePanelAction-expViewExplore'));
    await page.waitForNavigation();
  });

  step('renders the chart in exploratory view', async () => {
    await page.waitForLoadState('networkidle');
    expect(await page.waitForSelector('text=User experience (RUM)'));
    expect(await page.waitForSelector('text=Page views'));
    expect(await page.waitForSelector('text=Chrome'));
    expect(await page.waitForSelector('text=Chrome Mobile iOS'));
    expect(await page.waitForSelector('text=Edge'));
    expect(await page.waitForSelector('text=Safari'));
    expect(await page.waitForSelector('text=Firefox'));
  });
});
