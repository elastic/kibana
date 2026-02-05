/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';
import { EXTENDED_TIMEOUT, PRODUCTION_ENVIRONMENT } from '../../fixtures/constants';

test.describe('Service Overview - Filters', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('persists transaction type when clicking Transactions tab', async ({
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_OPBEANS_NODE,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Verify initial transaction type is request', async () => {
      await expect(serviceDetailsPage.overviewTab.getTransactionTypeFilter()).toHaveValue(
        'request'
      );
    });

    await test.step('Select Worker transaction type', async () => {
      await serviceDetailsPage.overviewTab.selectTransactionType('Worker');
      await expect(serviceDetailsPage.overviewTab.getTransactionTypeFilter()).toHaveValue('Worker');
    });

    await test.step('Click Transactions tab and verify type persists', async () => {
      await serviceDetailsPage.transactionsTab.clickTab();
      await expect(serviceDetailsPage.overviewTab.getTransactionTypeFilter()).toHaveValue('Worker');
    });
  });

  test('persists transaction type when clicking View transactions link', async ({
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_OPBEANS_NODE,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Select Worker transaction type', async () => {
      await serviceDetailsPage.overviewTab.selectTransactionType('Worker');
      await expect(serviceDetailsPage.overviewTab.getTransactionTypeFilter()).toHaveValue('Worker');
    });

    await test.step('Click View transactions link and verify type persists', async () => {
      await serviceDetailsPage.overviewTab.clickViewTransactionsLink();
      await expect(serviceDetailsPage.overviewTab.getTransactionTypeFilter()).toHaveValue('Worker');
    });
  });

  test('filters by environment', async ({ page, pageObjects: { serviceDetailsPage } }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_OPBEANS_NODE,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Verify environment filter is visible', async () => {
      await expect(serviceDetailsPage.overviewTab.getEnvironmentFilter()).toBeVisible();
    });

    await test.step('Select production environment', async () => {
      await serviceDetailsPage.overviewTab.selectEnvironment(PRODUCTION_ENVIRONMENT);
    });

    await test.step('Verify URL contains environment parameter', async () => {
      await page.waitForURL(new RegExp(`environment=${PRODUCTION_ENVIRONMENT}`));
      expect(page.url()).toContain(`environment=${PRODUCTION_ENVIRONMENT}`);
    });
  });

  test('changes comparison window', async ({ pageObjects: { serviceDetailsPage } }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_OPBEANS_NODE,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Verify default comparison is 1 day', async () => {
      await expect(serviceDetailsPage.overviewTab.getComparisonSelect()).toHaveValue('1d');
    });

    await test.step('Select 1 week comparison', async () => {
      await serviceDetailsPage.overviewTab.selectComparison('1w');
    });

    await test.step('Verify 1 week comparison is selected', async () => {
      await expect(serviceDetailsPage.overviewTab.getComparisonSelect()).toHaveValue('1w');
    });
  });

  test('refresh button refreshes data', async ({ pageObjects: { serviceDetailsPage } }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_OPBEANS_NODE,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Verify refresh button is visible', async () => {
      await expect(serviceDetailsPage.overviewTab.getRefreshButton()).toBeVisible();
    });

    await test.step('Click refresh button and verify page still works', async () => {
      await serviceDetailsPage.overviewTab.clickRefreshButton();
      await expect(serviceDetailsPage.overviewTab.latencyChart).toBeVisible();
    });
  });

  test('updates data when changing time range and clicking update', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_OPBEANS_NODE,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Open date picker and select new time range', async () => {
      // Click on the date picker button to open it
      await page
        .getByTestId('apmSloCalloutCreateSloButton')
        .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
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
      await page.waitForURL(/2021-10-09/, { timeout: EXTENDED_TIMEOUT });
      expect(page.url()).toContain('2021-10-09');
    });

    await test.step('Verify page still renders correctly', async () => {
      await expect(serviceDetailsPage.overviewTab.latencyChart).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    });
  });
});
