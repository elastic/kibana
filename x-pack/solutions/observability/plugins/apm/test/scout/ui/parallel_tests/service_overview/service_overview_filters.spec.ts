/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData, BIGGER_TIMEOUT } from '../../fixtures';

test.describe('Service Overview - Filters', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('persists transaction type when clicking Transactions tab', async ({
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: testData.SERVICE_OPBEANS_NODE,
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Verify initial transaction type is request', async () => {
      await expect(serviceDetailsPage.getTransactionTypeFilter()).toHaveValue('request');
    });

    await test.step('Select Worker transaction type', async () => {
      await serviceDetailsPage.selectTransactionType('Worker');
      await expect(serviceDetailsPage.getTransactionTypeFilter()).toHaveValue('Worker');
    });

    await test.step('Click Transactions tab and verify type persists', async () => {
      await serviceDetailsPage.clickTransactionsTab();
      await expect(serviceDetailsPage.getTransactionTypeFilter()).toHaveValue('Worker');
    });
  });

  test('persists transaction type when clicking View transactions link', async ({
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: testData.SERVICE_OPBEANS_NODE,
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Select Worker transaction type', async () => {
      await serviceDetailsPage.selectTransactionType('Worker');
      await expect(serviceDetailsPage.getTransactionTypeFilter()).toHaveValue('Worker');
    });

    await test.step('Click View transactions link and verify type persists', async () => {
      await serviceDetailsPage.clickViewTransactionsLink();
      await expect(serviceDetailsPage.getTransactionTypeFilter()).toHaveValue('Worker');
    });
  });

  test('filters by environment', async ({ page, pageObjects: { serviceDetailsPage } }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: testData.SERVICE_OPBEANS_NODE,
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Verify environment filter is visible', async () => {
      await expect(serviceDetailsPage.getEnvironmentFilter()).toBeVisible();
    });

    await test.step('Select production environment', async () => {
      await serviceDetailsPage.selectEnvironment('production');
    });

    await test.step('Verify URL contains environment parameter', async () => {
      await page.waitForURL(/environment=production/);
      expect(page.url()).toContain('environment=production');
    });
  });

  test('changes comparison window', async ({ pageObjects: { serviceDetailsPage } }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: testData.SERVICE_OPBEANS_NODE,
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Verify default comparison is 1 day', async () => {
      await expect(serviceDetailsPage.getComparisonSelect()).toHaveValue('1d');
    });

    await test.step('Select 1 week comparison', async () => {
      await serviceDetailsPage.selectComparison('1w');
    });

    await test.step('Verify 1 week comparison is selected', async () => {
      await expect(serviceDetailsPage.getComparisonSelect()).toHaveValue('1w');
    });
  });

  test('refresh button refreshes data', async ({ pageObjects: { serviceDetailsPage } }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: testData.SERVICE_OPBEANS_NODE,
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Verify refresh button is visible', async () => {
      await expect(serviceDetailsPage.getRefreshButton()).toBeVisible();
    });

    await test.step('Click refresh button and verify page still works', async () => {
      await serviceDetailsPage.clickRefreshButton();
      await expect(serviceDetailsPage.latencyChart).toBeVisible();
    });
  });

  test('updates data when changing time range and clicking update', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: testData.SERVICE_OPBEANS_NODE,
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Open date picker and select new time range', async () => {
      // Click on the date picker button to open it
      await page
        .getByTestId('apmSloCalloutCreateSloButton')
        .waitFor({ state: 'visible', timeout: BIGGER_TIMEOUT });
      await page.getByTestId('superDatePickerToggleQuickMenuButton').click();

      // Click on "Absolute" tab for the start date
      await page.getByTestId('superDatePickerstartDatePopoverButton').click();
      await page.getByTestId('superDatePickerAbsoluteTab').click();

      // Clear and set new start date (5 minutes earlier)
      const startDateInput = page.getByTestId('superDatePickerAbsoluteDateInput');
      await startDateInput.clear();
      await startDateInput.fill('2021-10-09T23:55:00.000Z');
      await startDateInput.press('Enter');
    });

    await test.step('Click Update button and verify URL is updated', async () => {
      await page.getByTestId('querySubmitButton').click();

      // Wait for URL to update with new time range
      await page.waitForURL(/2021-10-09/, { timeout: BIGGER_TIMEOUT });
      expect(page.url()).toContain('2021-10-09');
    });

    await test.step('Verify page still renders correctly', async () => {
      await expect(serviceDetailsPage.latencyChart).toBeVisible({ timeout: BIGGER_TIMEOUT });
    });
  });
});
