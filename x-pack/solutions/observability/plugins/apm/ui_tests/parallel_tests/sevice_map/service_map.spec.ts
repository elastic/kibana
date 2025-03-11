/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

test.describe('Service Map', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { serviceMapPage } }) => {
    await browserAuth.loginAsViewer();
    await serviceMapPage.gotoWithDateSelected(start, end);
  });

  test('shows the service map', async ({ page, pageObjects: { serviceMapPage } }) => {
    await serviceMapPage.gotoWithDateSelected(start, end);
    expect(page.url()).toContain('/app/apm/service-map');
    await serviceMapPage.waitForServiceMapToLoad();
    await serviceMapPage.zoomInBtn.click();
    await serviceMapPage.centerServiceMapBtn.click();
    await serviceMapPage.waitForServiceMapToLoad();
  });

  test('shows a detailed service map', async ({ page, pageObjects: { serviceMapPage } }) => {
    await serviceMapPage.gotoDetailedServiceMapWithDateSelected(start, end);
    expect(page.url()).toContain('/services/opbeans-java/service-map');
    await serviceMapPage.waitForServiceMapToLoad();
    await serviceMapPage.zoomInBtn.click();
    await serviceMapPage.centerServiceMapBtn.click();
    await serviceMapPage.waitForServiceMapToLoad();
  });

  test('shows empty state when there is no data', async ({
    page,
    pageObjects: { serviceMapPage },
  }) => {
    await serviceMapPage.typeInTheSearchBar();
    await serviceMapPage.waitForServiceMapToLoad();
    page.getByText('No services available');
    // search bar is still visible
    await expect(page.getByTestId('apmUnifiedSearchBar')).toBeVisible();
  });
});
