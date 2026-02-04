/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

test.describe('Service Overview - Mobile Services', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('clicking android service redirects to mobile service overview', async ({
    page,
    pageObjects: { serviceInventoryPage, serviceDetailsPage },
  }) => {
    await serviceInventoryPage.gotoServiceInventory({
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Click on android mobile service', async () => {
      await serviceInventoryPage.clickServiceLink(testData.SERVICE_MOBILE_ANDROID);
    });

    await test.step('Verify redirected to mobile service overview', async () => {
      await serviceInventoryPage.waitForServiceOverviewToLoad();
      await expect(serviceDetailsPage.getServiceHeaderName()).toHaveText(
        testData.SERVICE_MOBILE_ANDROID
      );
      await expect(page).toHaveURL(/mobile-services/);
    });
  });

  test('clicking iOS service redirects to mobile service overview', async ({
    page,
    pageObjects: { serviceInventoryPage, serviceDetailsPage },
  }) => {
    await serviceInventoryPage.gotoServiceInventory({
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Click on iOS mobile service', async () => {
      await serviceInventoryPage.clickServiceLink(testData.SERVICE_MOBILE_IOS);
    });

    await test.step('Verify redirected to mobile service overview', async () => {
      await serviceInventoryPage.waitForServiceOverviewToLoad();
      await expect(serviceDetailsPage.getServiceHeaderName()).toHaveText(
        testData.SERVICE_MOBILE_IOS
      );
      await expect(page).toHaveURL(/mobile-services/);
    });
  });

  test('mobile service overview renders all components', async ({
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.goToMobileServiceOverview(testData.SERVICE_MOBILE_ANDROID, {
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Verify service name is displayed', async () => {
      await expect(serviceDetailsPage.getServiceHeaderName()).toHaveText(
        testData.SERVICE_MOBILE_ANDROID
      );
    });

    await test.step('Verify latency chart is visible', async () => {
      await expect(serviceDetailsPage.overviewTab.latencyChart).toBeVisible();
    });

    await test.step('Verify throughput chart is visible', async () => {
      await expect(serviceDetailsPage.overviewTab.throughputChart).toBeVisible();
    });
  });

  test('accessing mobile service from apm route redirects to mobile route', async ({
    page,
    kbnUrl,
  }) => {
    // Navigate directly to APM service route for a mobile service
    await page.goto(
      `${kbnUrl.app('apm')}/services/${testData.SERVICE_MOBILE_ANDROID}/overview?rangeFrom=${
        testData.START_DATE
      }&rangeTo=${testData.END_DATE}`
    );

    await test.step('Verify redirected to mobile-services route', async () => {
      await page.waitForURL(/mobile-services/, { timeout: EXTENDED_TIMEOUT });
      expect(page.url()).toContain('mobile-services');
      expect(page.url()).toContain(testData.SERVICE_MOBILE_ANDROID);
    });
  });
});
