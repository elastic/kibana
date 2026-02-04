/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

test.describe('Service Overview - Error Details', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('OTEL service navigates to errors page from overview', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_OTEL_SENDOTLP,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Click View errors link and wait for navigation', async () => {
      await page.getByRole('link', { name: 'View errors' }).click();
      await page
        .getByTestId('apmSettingsHeaderLink')
        .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    });

    await test.step('Verify navigated to errors page', async () => {
      await expect(page).toHaveURL(new RegExp(`/${testData.SERVICE_OTEL_SENDOTLP}/errors`));
    });
  });

  test('OTEL service clicking error in overview table navigates to error detail page', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_OTEL_SENDOTLP,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Verify error is visible in errors table', async () => {
      await expect(page.getByText('boom')).toBeVisible();
    });

    await test.step('Click on error link and wait for navigation', async () => {
      await page.getByRole('link', { name: 'boom' }).click();
      await page
        .getByTestId('errorDistribution')
        .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    });

    await test.step('Verify navigated to error detail page', async () => {
      await expect(page.getByTestId('errorDistribution')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    });
  });

  test('OTEL service error detail page shows error distribution chart', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_OTEL_SENDOTLP,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Click on error link to go to detail page', async () => {
      await page.getByTestId('apmErrorDetailsLink').click();
      await page
        .getByTestId('errorDistribution')
        .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    });

    await test.step('Verify error distribution chart is visible', async () => {
      await expect(page.getByTestId('errorDistribution')).toBeVisible();
    });
  });

  test('EDOT service navigates to errors page from overview', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_EDOT_ADSERVICE,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Click View errors link and wait for navigation', async () => {
      await page.getByRole('link', { name: 'View errors' }).click();
      await page
        .getByTestId('apmSettingsHeaderLink')
        .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    });

    await test.step('Verify navigated to errors page', async () => {
      await expect(page).toHaveURL(new RegExp(`/${testData.SERVICE_EDOT_ADSERVICE}/errors`));
    });
  });

  test('EDOT service clicking error in overview table navigates to error detail page', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_EDOT_ADSERVICE,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Verify error is visible in errors table', async () => {
      await expect(page.getByRole('link', { name: 'ResponseError', exact: true })).toBeVisible();
    });

    await test.step('Click on error link and wait for navigation', async () => {
      await page.getByRole('link', { name: 'ResponseError', exact: true }).click();
      await page
        .getByTestId('errorDistribution')
        .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    });

    await test.step('Verify navigated to error detail page', async () => {
      await expect(page.getByText(testData.EDOT_ERROR_MESSAGE)).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    });
  });

  test('EDOT service error detail page shows error distribution chart', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_EDOT_ADSERVICE,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Click on error link to go to detail page', async () => {
      await page.getByRole('link', { name: 'ResponseError', exact: true }).click();
      await page
        .getByTestId('errorDistribution')
        .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    });

    await test.step('Verify error distribution chart is visible', async () => {
      await expect(page.getByTestId('errorDistribution')).toBeVisible();
    });
  });
});
