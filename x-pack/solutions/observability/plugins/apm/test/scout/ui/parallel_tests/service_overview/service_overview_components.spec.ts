/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';

test.describe('Service Overview - Components', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('renders all components on the service overview page', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: testData.SERVICE_OPBEANS_NODE,
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Renders service name', async () => {
      await expect(serviceDetailsPage.getServiceHeaderName()).toHaveText(
        testData.SERVICE_OPBEANS_NODE
      );
    });

    await test.step('Renders latency chart', async () => {
      await expect(serviceDetailsPage.latencyChart).toBeVisible();
    });

    await test.step('Renders throughput chart', async () => {
      await expect(serviceDetailsPage.throughputChart).toBeVisible();
    });

    await test.step('Renders transactions group table', async () => {
      await expect(serviceDetailsPage.transactionsGroupTable).toBeVisible();
    });

    await test.step('Renders errors table', async () => {
      await expect(serviceDetailsPage.serviceOverviewErrorsTable).toBeVisible();
    });

    await test.step('Renders dependencies table', async () => {
      await expect(page.getByTestId('dependenciesTable')).toBeVisible();
    });

    await test.step('Renders instances latency distribution', async () => {
      await expect(serviceDetailsPage.instancesLatencyDistribution).toBeVisible();
    });

    await test.step('Renders instances table', async () => {
      await expect(serviceDetailsPage.serviceOverviewInstancesTable).toBeVisible();
    });

    await test.step('Check a11y violations', async () => {
      const { violations } = await page.checkA11y({ include: ['main'] });
      expect(violations).toHaveLength(0);
    });
  });

  test('hides dependencies tab and instances table for RUM service', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: testData.SERVICE_OPBEANS_RUM,
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Verify standard tabs are visible', async () => {
      await expect(serviceDetailsPage.getOverviewTab()).toBeVisible();
      await expect(serviceDetailsPage.getTransactionsTab()).toBeVisible();
      await expect(serviceDetailsPage.getErrorsTab()).toBeVisible();
      await expect(serviceDetailsPage.getServiceMapTab()).toBeVisible();
    });

    await test.step('Verify dependencies tab is NOT visible', async () => {
      const tabs = page.locator('.euiTabs .euiTab__content');
      const tabTexts = await tabs.allTextContents();
      expect(tabTexts).not.toContain('Dependencies');
    });

    await test.step('Verify instances table is hidden', async () => {
      await expect(serviceDetailsPage.getInstancesTableContainer()).toBeHidden();
    });
  });

  test('displays instance data and shows details when expanded', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: testData.SERVICE_OPBEANS_JAVA,
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Verify service name is displayed', async () => {
      await expect(serviceDetailsPage.getServiceHeaderName()).toHaveText(
        testData.SERVICE_OPBEANS_JAVA
      );
    });

    await test.step('Verify instance name is displayed in table', async () => {
      await expect(page.getByText(testData.OPBEANS_JAVA_INSTANCE)).toBeVisible();
    });

    await test.step('Click instance details button and verify details visible', async () => {
      await serviceDetailsPage.clickInstanceDetailsButton(testData.OPBEANS_JAVA_INSTANCE);
      await expect(page.getByRole('button', { name: 'Service Service' })).toBeVisible();
    });
  });

  test('shows actions menu when clicking actions button', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: testData.SERVICE_OPBEANS_JAVA,
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Click instance actions button', async () => {
      await expect(page.getByText(testData.OPBEANS_JAVA_INSTANCE)).toBeVisible();
      await serviceDetailsPage.clickInstanceActionsButton(testData.OPBEANS_JAVA_INSTANCE);
    });

    await test.step('Verify action menu items are visible', async () => {
      await expect(page.getByText('Pod logs')).toBeVisible();
      await expect(page.getByText('Pod metrics')).toBeVisible();
      await expect(page.getByText('Filter overview by instance')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Metrics', exact: true })).toBeVisible();
    });
  });

  test('shows empty message when no instances found', async ({
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.goToOverviewTab({
      serviceName: 'test-nonexistent-service',
      rangeFrom: testData.OPBEANS_START_DATE,
      rangeTo: testData.OPBEANS_END_DATE,
    });

    await test.step('Verify service header shows the service name', async () => {
      await expect(serviceDetailsPage.getServiceHeaderName()).toHaveText(
        'test-nonexistent-service'
      );
    });

    await test.step('Verify empty instances message', async () => {
      await expect(serviceDetailsPage.getInstancesTableContainer()).toContainText(
        'No instances found'
      );
    });
  });
});
