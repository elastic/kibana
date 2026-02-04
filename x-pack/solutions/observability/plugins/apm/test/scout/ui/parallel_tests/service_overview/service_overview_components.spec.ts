/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

test.describe('Service Overview - Components', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('renders all components on the service overview page', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_OPBEANS_NODE,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Renders service name', async () => {
      await expect(serviceDetailsPage.getServiceHeaderName()).toHaveText(
        testData.SERVICE_OPBEANS_NODE
      );
    });

    await test.step('Renders latency chart', async () => {
      await expect(serviceDetailsPage.overviewTab.latencyChart).toBeVisible();
    });

    await test.step('Renders throughput chart', async () => {
      await expect(serviceDetailsPage.overviewTab.throughputChart).toBeVisible();
    });

    await test.step('Renders transactions group table', async () => {
      await expect(serviceDetailsPage.overviewTab.transactionsGroupTable).toBeVisible();
    });

    await test.step('Renders errors table', async () => {
      await expect(serviceDetailsPage.overviewTab.serviceOverviewErrorsTable).toBeVisible();
    });

    await test.step('Renders dependencies table', async () => {
      await expect(page.getByTestId('dependenciesTable')).toBeVisible();
    });

    await test.step('Renders instances latency distribution', async () => {
      await expect(serviceDetailsPage.overviewTab.instancesLatencyDistribution).toBeVisible();
    });

    await test.step('Renders instances table', async () => {
      await expect(serviceDetailsPage.overviewTab.serviceOverviewInstancesTable).toBeVisible();
    });

    await test.step('Check a11y violations', async () => {
      const { violations } = await page.checkA11y({ include: ['main'] });
      expect(violations).toHaveLength(0);
    });
  });

  test('hides dependencies tab and instances table for RUM service', async ({
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.overviewTab.goToTab({
      serviceName: testData.SERVICE_OPBEANS_RUM,
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await test.step('Verify standard tabs are visible', async () => {
      await expect(serviceDetailsPage.overviewTab.tab).toBeVisible();
      await expect(serviceDetailsPage.transactionsTab.tab).toBeVisible();
      await expect(serviceDetailsPage.errorsTab.tab).toBeVisible();
      await expect(serviceDetailsPage.getServiceMapTab()).toBeVisible();
    });

    await test.step('Verify dependencies tab is NOT visible', async () => {
      await expect(serviceDetailsPage.dependenciesTab.tab).toBeHidden();
    });

    await test.step('Verify instances table is hidden', async () => {
      await expect(serviceDetailsPage.overviewTab.getInstancesTableContainer()).toBeHidden();
    });
  });
});
