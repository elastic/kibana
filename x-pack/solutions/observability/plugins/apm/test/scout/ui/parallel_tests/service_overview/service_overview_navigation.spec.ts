/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

test.describe('Service Overview - Navigation', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('clicking service in inventory navigates to service overview', async ({
    page,
    pageObjects: { serviceInventoryPage, serviceDetailsPage },
  }) => {
    await serviceInventoryPage.gotoServiceInventory({
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Verify services table is visible', async () => {
      await expect(serviceInventoryPage.servicesTable).toBeVisible();
    });

    await test.step('Click on opbeans-java service', async () => {
      await serviceInventoryPage.clickServiceLink(testData.SERVICE_OPBEANS_JAVA);
    });

    await test.step('Verify navigated to service overview page', async () => {
      await serviceInventoryPage.waitForServiceOverviewToLoad();
      await expect(serviceDetailsPage.getServiceHeaderName()).toHaveText(
        testData.SERVICE_OPBEANS_JAVA
      );
      await expect(page).toHaveURL(new RegExp(`/services/${testData.SERVICE_OPBEANS_JAVA}`));
    });
  });

  test('clicking go service navigates to correct service overview', async ({
    page,
    pageObjects: { serviceInventoryPage, serviceDetailsPage },
  }) => {
    await serviceInventoryPage.gotoServiceInventory({
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Click on service-go service', async () => {
      await serviceInventoryPage.clickServiceLink(testData.SERVICE_GO);
    });

    await test.step('Verify navigated to service overview page', async () => {
      await serviceInventoryPage.waitForServiceOverviewToLoad();
      await expect(serviceDetailsPage.getServiceHeaderName()).toHaveText(testData.SERVICE_GO);
      await expect(page).toHaveURL(new RegExp(`/services/${testData.SERVICE_GO}`));
    });
  });

  test('clicking transaction navigates to transactions tab', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_OPBEANS_JAVA,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Verify transactions table is visible', async () => {
      await expect(serviceDetailsPage.overviewTab.transactionsGroupTable).toBeVisible();
    });

    await test.step('Click on a transaction', async () => {
      await serviceDetailsPage.transactionsTab.clickTransactionLink(
        testData.PRODUCT_TRANSACTION_NAME
      );
    });

    await test.step('Verify navigated to transactions view', async () => {
      await expect(page).toHaveURL(/\/transactions\/view/);
    });
  });

  test('clicking error navigates to error details', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_OPBEANS_JAVA,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Verify errors table is visible', async () => {
      await expect(serviceDetailsPage.overviewTab.serviceOverviewErrorsTable).toBeVisible();
    });

    await test.step('Click on an error', async () => {
      await serviceDetailsPage.errorsTab.clickErrorLink('MockError');
    });

    await test.step('Verify navigated to error details', async () => {
      await expect(page).toHaveURL(/\/errors\//);
    });
  });
});
