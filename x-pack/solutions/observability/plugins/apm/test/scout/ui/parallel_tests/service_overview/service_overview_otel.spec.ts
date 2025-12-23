/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';

// Note: Using regular APM service since Scout's apmSynthtraceEsClient doesn't support OTEL pipeline
test.describe('Service Overview - OTEL Services', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('sendotlp service renders all components', async ({
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: testData.SERVICE_OTEL_SENDOTLP,
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Verify service name is displayed', async () => {
      await expect(serviceDetailsPage.getServiceHeaderName()).toHaveText(
        testData.SERVICE_OTEL_SENDOTLP
      );
    });

    await test.step('Verify latency chart is visible', async () => {
      await expect(serviceDetailsPage.latencyChart).toBeVisible();
    });

    await test.step('Verify throughput chart is visible', async () => {
      await expect(serviceDetailsPage.throughputChart).toBeVisible();
    });

    await test.step('Verify transactions table is visible', async () => {
      await expect(serviceDetailsPage.transactionsGroupTable).toBeVisible();
    });

    await test.step('Verify errors table is visible', async () => {
      await expect(serviceDetailsPage.serviceOverviewErrorsTable).toBeVisible();
    });

    await test.step('Verify instances table is visible', async () => {
      await expect(serviceDetailsPage.serviceOverviewInstancesTable).toBeVisible();
    });
  });

  test('sendotlp service instances table has data', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: testData.SERVICE_OTEL_SENDOTLP,
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Verify instances table has data', async () => {
      await expect(serviceDetailsPage.serviceOverviewInstancesTable).toBeVisible();
      // Instance ID should be visible in the table
      await expect(page.getByText(testData.OTEL_INSTANCE_ID)).toBeVisible();
    });
  });

  test('sendotlp service transaction type persistence', async ({
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: testData.SERVICE_OTEL_SENDOTLP,
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Verify transaction type filter exists', async () => {
      await expect(serviceDetailsPage.getTransactionTypeFilter()).toBeVisible();
    });

    await test.step('Click Transactions tab and verify filter persists', async () => {
      const initialValue = await serviceDetailsPage.getTransactionTypeFilter().inputValue();
      await serviceDetailsPage.clickTransactionsTab();
      await expect(serviceDetailsPage.getTransactionTypeFilter()).toHaveValue(initialValue);
    });
  });

  test('sendotlp service errors table shows errors', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: testData.SERVICE_OTEL_SENDOTLP,
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Verify errors table is visible', async () => {
      await expect(serviceDetailsPage.serviceOverviewErrorsTable).toBeVisible();
    });

    await test.step('Verify error is displayed in errors table', async () => {
      // The error message 'boom' from synthtrace data
      await expect(page.getByText('boom')).toBeVisible();
    });
  });

  test('sendotlp service can navigate to errors tab', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: testData.SERVICE_OTEL_SENDOTLP,
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Click errors tab', async () => {
      await serviceDetailsPage.clickErrorsTab();
    });

    await test.step('Verify errors page is displayed', async () => {
      await expect(page).toHaveURL(/\/errors/);
    });
  });

  test('sendotlp service icons show metadata details on click', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: testData.SERVICE_OTEL_SENDOTLP,
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Click service icon and verify metadata popup shows framework name', async () => {
      await expect(page.getByTestId('apmMainTemplateHeaderServiceName')).toHaveText(
        testData.SERVICE_OTEL_SENDOTLP
      );
      await serviceDetailsPage.clickServiceIcon();
      await expect(page.getByText('go', { exact: true })).toBeVisible();
    });
  });
});
