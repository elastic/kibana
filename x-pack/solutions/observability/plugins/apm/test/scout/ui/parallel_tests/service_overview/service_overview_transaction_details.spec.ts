/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

test.describe('Service Overview - Transaction Details', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('OTEL service navigates to transaction detail page from overview', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_OTEL_SENDOTLP,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Click Transactions tab', async () => {
      await serviceDetailsPage.transactionsTab.clickTab();
    });

    await test.step('Click on transaction link and wait for page to load', async () => {
      await page.getByRole('link', { name: testData.OTEL_TRANSACTION_NAME }).click();
      await page
        .getByTestId('apmSettingsHeaderLink')
        .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    });

    await test.step('Verify transaction detail page shows transaction name', async () => {
      await expect(
        page.getByRole('heading', { name: testData.OTEL_TRANSACTION_NAME, level: 2 })
      ).toBeVisible();
    });
  });

  test('OTEL service transaction detail page shows waterfall', async ({
    page,
    pageObjects: { transactionDetailsPage },
  }) => {
    await transactionDetailsPage.goToTransactionDetails({
      serviceName: testData.SERVICE_OTEL_SENDOTLP,
      transactionName: testData.OTEL_TRANSACTION_NAME,
      start: testData.START_DATE,
      end: testData.END_DATE,
    });

    await test.step('Verify waterfall button is visible', async () => {
      await expect(page.getByTestId('apmWaterfallButton')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    });
  });

  test('OTEL service clicking waterfall accordion shows transaction details flyout', async ({
    page,
    pageObjects: { transactionDetailsPage },
  }) => {
    await transactionDetailsPage.goToTransactionDetails({
      serviceName: testData.SERVICE_OTEL_SENDOTLP,
      transactionName: testData.OTEL_TRANSACTION_NAME,
      start: testData.START_DATE,
      end: testData.END_DATE,
    });

    await test.step('Verify waterfall item is initially visible', async () => {
      await expect(page.getByLabel('View details for child1')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    });

    await test.step('Click on waterfall accordion to fold', async () => {
      await page.getByTestId('apmWaterfallButton').click();
    });

    await test.step('Verify transaction details flyout is hidden', async () => {
      await expect(page.getByLabel('View details for child1')).toBeHidden();
    });

    await test.step('Click on the same waterfall accordion to unfold', async () => {
      await page.getByTestId('apmWaterfallButton').click();
    });

    await test.step('Verify transaction details flyout is visible', async () => {
      await expect(page.getByLabel('View details for child1')).toBeVisible();
    });
  });

  test('EDOT service navigates to transaction detail page from overview', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_EDOT_ADSERVICE,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Click Transactions tab', async () => {
      await serviceDetailsPage.transactionsTab.clickTab();
    });

    await test.step('Click on transaction link and wait for page to load', async () => {
      await page.getByRole('link', { name: testData.EDOT_TRANSACTION_NAME }).click();
      await page
        .getByTestId('apmSettingsHeaderLink')
        .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    });

    await test.step('Verify transaction detail page shows transaction name', async () => {
      await expect(
        page.getByRole('heading', { name: testData.EDOT_TRANSACTION_NAME, level: 2 })
      ).toBeVisible();
    });
  });

  test('EDOT service transaction detail page shows waterfall', async ({
    page,
    pageObjects: { transactionDetailsPage },
  }) => {
    await transactionDetailsPage.goToTransactionDetails({
      serviceName: testData.SERVICE_EDOT_ADSERVICE,
      transactionName: testData.EDOT_TRANSACTION_NAME,
      start: testData.START_DATE,
      end: testData.END_DATE,
    });

    await test.step('Verify waterfall button is visible', async () => {
      await expect(page.getByTestId('apmWaterfallButton')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    });

    await test.step('Verify waterfall is rendered', async () => {
      await expect(page.getByTestId('waterfallItem')).toBeVisible();
    });
  });

  test('EDOT service clicking waterfall accordion shows transaction details flyout', async ({
    page,
    pageObjects: { transactionDetailsPage },
  }) => {
    await transactionDetailsPage.goToTransactionDetails({
      serviceName: testData.SERVICE_EDOT_ADSERVICE,
      transactionName: testData.EDOT_TRANSACTION_NAME,
      start: testData.START_DATE,
      end: testData.END_DATE,
    });

    await test.step('Click on waterfall accordion', async () => {
      await page.getByTestId('apmWaterfallButton').click();
    });

    await test.step('Verify service name in flyout', async () => {
      await expect(page.getByTestId('waterfallItem')).toContainText(testData.EDOT_TRANSACTION_NAME);
    });
  });
});
