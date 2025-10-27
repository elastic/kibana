/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';

const timeRange = {
  rangeFrom: testData.OPBEANS_START_DATE,
  rangeTo: testData.OPBEANS_END_DATE,
};

test.describe('Storage Explorer - Viewer (No Permissions)', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('displays permission denied message', async ({
    page,
    pageObjects: { storageExplorerPage },
  }) => {
    await storageExplorerPage.goto();
    await expect(storageExplorerPage.pageTitle).toBeVisible();

    await test.step('verify permission denied is shown', async () => {
      await expect(page.getByText('You need permission')).toBeVisible();
    });
  });
});

test.describe('Storage Explorer - Admin User', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    // Use privileged user (admin) to ensure we have all necessary permissions
    await browserAuth.loginAsAdmin();
  });

  test('user navigates and explores storage explorer functionality', async ({
    page,
    pageObjects: { storageExplorerPage },
  }) => {
    await test.step('verify charts and data in the storageExplorerServicesTable', async () => {
      await storageExplorerPage.goto();
      await expect(storageExplorerPage.pageTitle).toBeVisible();

      // Verify the chart is present
      await expect(await storageExplorerPage.storageChart).toBeVisible();

      // Verify the summary title elements are present
      const summaryStatTitleElements = await storageExplorerPage.getSummaryStatTitleElements();
      for (const element of summaryStatTitleElements) {
        await expect(element).toBeVisible();
      }

      // Wait for the services table to finish loading
      await storageExplorerPage.waitForServicesTableLoaded();
      await expect(storageExplorerPage.servicesTableLoadedIndicator).toBeVisible();

      // Verify the service icon links are present
      await page.getByTestId('serviceLink_nodejs').scrollIntoViewIfNeeded();
      await expect(page.getByTestId('serviceLink_nodejs')).toBeVisible();
      await expect(page.getByTestId('serviceLink_go')).toHaveCount(2);

      // Verify the synthetic services with actual data are present
      await expect(page.getByLabel('synth-node-1')).toBeVisible();
      await expect(page.getByLabel('synth-go-1')).toBeVisible();
      await expect(page.getByLabel('synth-go-2')).toBeVisible();
    });

    await test.step('verify navigation links Go to Service inventory and Go to Index Management and the Download report link are visible', async () => {
      // Check for "Go to Service inventory" link using exact test ID
      const serviceInventoryLink = page.getByTestId('apmSummaryStatsGoToServiceInventoryLink');
      await expect(serviceInventoryLink).toBeVisible();

      // Check for "Go to Index Management" link using exact test ID
      const indexManagementLink = page.getByTestId('apmSummaryStatsGoToIndexManagementLink');
      await expect(indexManagementLink).toBeVisible();

      // Check for "Download report" link using exact test ID
      const downloadReportLink = page.getByTestId('StorageExplorerDownloadReportButton');
      await expect(downloadReportLink).toBeVisible();
      await expect(downloadReportLink).toBeEnabled();
    });

    await test.step('test environment parameter in URL', async () => {
      // Use the storageExplorerPage method but with environment parameter
      await storageExplorerPage.goto();
      const baseUrl = page.url().split('?')[0];

      const urlParams = new URLSearchParams({
        rangeFrom: timeRange.rangeFrom,
        rangeTo: timeRange.rangeTo,
        environment: 'production',
      });

      await page.goto(`${baseUrl}?${urlParams.toString()}`);
      await page.waitForLoadingIndicatorHidden();

      await expect(page).toHaveURL(/.*environment=production.*/);
      await expect(storageExplorerPage.pageTitle).toBeVisible();
    });
  });
});
