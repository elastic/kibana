/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

// Note: Using regular APM service since Scout's apmSynthtraceEsClient doesn't support OTEL pipeline
test.describe('Service Overview - EDOT Services', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('adservice service renders all components', async ({
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_EDOT_ADSERVICE,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Verify service name is displayed', async () => {
      await expect(serviceDetailsPage.getServiceHeaderName()).toHaveText(
        testData.SERVICE_EDOT_ADSERVICE
      );
    });

    await test.step('Verify latency chart is visible', async () => {
      await expect(serviceDetailsPage.overviewTab.latencyChart).toBeVisible();
    });

    await test.step('Verify throughput chart is visible', async () => {
      await expect(serviceDetailsPage.overviewTab.throughputChart).toBeVisible();
    });

    await test.step('Verify transactions table is visible', async () => {
      await expect(serviceDetailsPage.overviewTab.transactionsGroupTable).toBeVisible();
    });

    await test.step('Verify errors table is visible', async () => {
      await expect(serviceDetailsPage.overviewTab.serviceOverviewErrorsTable).toBeVisible();
    });

    await test.step('Verify instances table is visible', async () => {
      await expect(serviceDetailsPage.overviewTab.serviceOverviewInstancesTable).toBeVisible();
    });
  });

  test('adservice service instances table has data', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_EDOT_ADSERVICE,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Verify instances table has data', async () => {
      await expect(serviceDetailsPage.overviewTab.serviceOverviewInstancesTable).toBeVisible();
      // Instance ID should be visible in the table
      await expect(page.getByText(testData.EDOT_INSTANCE_ID)).toBeVisible();
    });
  });

  test('adservice service errors table shows errors', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_EDOT_ADSERVICE,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Verify errors table is visible', async () => {
      await expect(serviceDetailsPage.overviewTab.serviceOverviewErrorsTable).toBeVisible();
    });

    await test.step('Verify error is displayed', async () => {
      // The error from synthtrace data
      await expect(page.getByRole('link', { name: 'ResponseError', exact: true })).toBeVisible();
    });
  });

  test('adservice service can navigate to errors tab', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_EDOT_ADSERVICE,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Click errors tab', async () => {
      await serviceDetailsPage.errorsTab.clickTab();
    });

    await test.step('Verify errors page is displayed', async () => {
      await expect(page).toHaveURL(/\/errors/);
    });
  });

  test('adservice service icons show metadata details on click', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_EDOT_ADSERVICE,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Click OpenTelemetry icon and verify metadata popup shows language', async () => {
      await serviceDetailsPage.overviewTab.clickOpenTelemetryIcon();
      await expect(page.getByText('java')).toBeVisible();
    });
  });
});
