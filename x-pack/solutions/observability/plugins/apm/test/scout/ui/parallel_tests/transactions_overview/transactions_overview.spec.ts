/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';
import { waitForApmSettingsHeaderLink } from '../../fixtures/page_helpers';
import { BIGGER_TIMEOUT } from '../../fixtures/constants';

test.describe('Transactions Overview', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('Viewer: Page has no detectable a11y violations on load', async ({
    page,
    pageObjects: { transactionsOverviewPage },
  }) => {
    await transactionsOverviewPage.goto(
      'service-go',
      testData.OPBEANS_START_DATE,
      testData.OPBEANS_END_DATE
    );

    // Verify Transactions tab is selected (same as original Cypress check)
    await expect(page.getByTestId('transactionsTab')).toHaveAttribute('aria-selected', 'true');

    // Run accessibility check scoped to the Kibana app wrapper (same as Cypress checkA11y)
    const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
    expect(violations).toStrictEqual([]);
  });

  test('Viewer: Persists transaction type selected when navigating to Overview tab', async ({
    page,
    pageObjects: { transactionsOverviewPage },
  }) => {
    await transactionsOverviewPage.goto(
      'service-node',
      testData.OPBEANS_START_DATE,
      testData.OPBEANS_END_DATE
    );

    // Verify default transaction type is 'request'
    const transactionTypeFilter = transactionsOverviewPage.getTransactionTypeFilter();
    await expect(transactionTypeFilter).toHaveValue('request');

    // Change to 'Worker' type
    await transactionsOverviewPage.selectTransactionType('Worker');
    await expect(transactionTypeFilter).toHaveValue('Worker');

    // Navigate to Overview tab
    await page.getByTestId('overviewTab').click();
    await waitForApmSettingsHeaderLink(page);

    // Verify transaction type is still 'Worker'
    await expect(transactionTypeFilter).toHaveValue('Worker');
  });

  test('Viewer: Includes the correct transactionNames in the detailed statistics request', async ({
    page,
    pageObjects: { transactionsOverviewPage },
  }) => {
    await transactionsOverviewPage.goto(
      'service-go',
      testData.OPBEANS_START_DATE,
      testData.OPBEANS_END_DATE
    );

    await expect(page.getByTestId('tableSearchInput')).toBeVisible({ timeout: BIGGER_TIMEOUT });

    await expect(page.getByTestId('transactionNameLink-DELETE /cart')).toBeVisible({
      timeout: BIGGER_TIMEOUT,
    });
    await expect(page.getByTestId('transactionNameLink-DELETE /categories')).toBeVisible();
    await expect(page.getByTestId('transactionNameLink-DELETE /customers')).toBeVisible();
    await expect(page.getByTestId('transactionNameLink-DELETE /invoices')).toBeVisible();
    await expect(page.getByTestId('transactionNameLink-DELETE /orders')).toBeVisible();
    await expect(page.getByTestId('transactionNameLink-DELETE /payments')).toBeVisible();
    await expect(page.getByTestId('transactionNameLink-DELETE /products')).toBeVisible();
    await expect(page.getByTestId('transactionNameLink-DELETE /profile')).toBeVisible();
    await expect(page.getByTestId('transactionNameLink-DELETE /reviews')).toBeVisible();
    await expect(page.getByTestId('transactionNameLink-DELETE /users')).toBeVisible();
  });
});
