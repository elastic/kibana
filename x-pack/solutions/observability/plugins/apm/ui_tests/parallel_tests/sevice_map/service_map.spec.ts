/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';

test.describe('Service Map', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('renders page with selected date range', async ({
    page,
    pageObjects: { serviceMapPage },
  }) => {
    await serviceMapPage.gotoWithDateSelected(
      testData.OPBEANS_START_DATE,
      testData.OPBEANS_END_DATE
    );
    expect(page.url()).toContain('/app/apm/service-map');
    await serviceMapPage.waitForServiceMapToLoad();
    await serviceMapPage.zoomInBtn.click();
    await serviceMapPage.centerServiceMapBtn.click();
    await serviceMapPage.waitForServiceMapToLoad();
  });

  test('shows a detailed service map', async ({ page, pageObjects: { serviceMapPage } }) => {
    await serviceMapPage.gotoDetailedServiceMapWithDateSelected(
      testData.OPBEANS_START_DATE,
      testData.OPBEANS_END_DATE
    );
    expect(page.url()).toContain('/services/opbeans-java/service-map');
    await serviceMapPage.waitForServiceMapToLoad();
    await serviceMapPage.zoomOutBtn.click();
    await serviceMapPage.centerServiceMapBtn.click();
    await serviceMapPage.zoomInBtn.click();
    await serviceMapPage.waitForServiceMapToLoad();
  });

  test('shows empty state when there is no data', async ({
    page,
    pageObjects: { serviceMapPage },
  }) => {
    await serviceMapPage.gotoWithDateSelected(
      testData.OPBEANS_START_DATE,
      testData.OPBEANS_END_DATE
    );
    await serviceMapPage.typeInTheSearchBar('_id : foo');
    await serviceMapPage.waitForServiceMapToLoad();
    await expect(serviceMapPage.noServicesPlaceholder).toBeVisible();
    await expect(serviceMapPage.noServicesPlaceholder).toHaveText('No services available');
    await expect(page.getByTestId('apmUnifiedSearchBar')).toBeVisible();
  });
});
