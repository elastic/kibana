/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';
import { waitForApmSettingsHeaderLink } from '../../fixtures/page_helpers';
import { PRODUCTION_ENVIRONMENT } from '../../fixtures/constants';

const timeRange = {
  rangeFrom: testData.START_DATE,
  rangeTo: testData.END_DATE,
};

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
      await expect(storageExplorerPage.storageChart).toBeVisible();

      // Verify the summary title elements are present
      const summaryStatTitleElements = await storageExplorerPage.getSummaryStatTitleElements();
      for (const element of summaryStatTitleElements) {
        await expect(element).toBeVisible();
      }

      // Wait for the services table to finish loading
      await storageExplorerPage.waitForServicesTableLoaded();
      await expect(storageExplorerPage.servicesTableLoadedIndicator).toBeVisible();

      // Change the environment to production to work better in MKI environment
      await page.getByTestId('comboBoxSearchInput').fill(PRODUCTION_ENVIRONMENT);
      await page.getByTestId('comboBoxSearchInput').press('Enter');
      await expect(page.getByTestId('StorageExplorerDownloadReportButton')).toBeEnabled();

      await expect(
        page.getByTestId('tableHeaderCell_serviceName_0').getByTestId('tableHeaderSortButton')
      ).toBeVisible();
      await page
        .getByTestId('tableHeaderCell_serviceName_0')
        .getByTestId('tableHeaderSortButton')
        .click();

      // Verify the service icon links are present
      await page.getByTestId('serviceLink_nodejs').scrollIntoViewIfNeeded();
      await expect(page.getByTestId('serviceLink_nodejs')).toBeVisible();
      await expect(page.getByTestId('serviceLink_go')).toHaveCount(2);

      // Verify the synthetic services with actual data are present
      await expect(page.getByLabel(testData.SERVICE_SYNTH_NODE_1)).toBeVisible();
      await expect(page.getByLabel(testData.SERVICE_SYNTH_GO)).toBeVisible();
      await expect(page.getByLabel(testData.SERVICE_SYNTH_GO_2)).toBeVisible();
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
        environment: PRODUCTION_ENVIRONMENT,
      });

      await page.goto(`${baseUrl}?${urlParams.toString()}`);
      await waitForApmSettingsHeaderLink(page);

      await expect(page).toHaveURL(new RegExp(`.*environment=${PRODUCTION_ENVIRONMENT}.*`));
      await expect(storageExplorerPage.pageTitle).toBeVisible();
    });
  });
});
