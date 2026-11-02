/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';
import { EXTENDED_TIMEOUT, PRODUCTION_ENVIRONMENT } from '../../fixtures/constants';
import { waitForSearchBarReady } from '../../fixtures/page_helpers';

test.describe(
  'Service Overview - Filters',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
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
        await expect(serviceDetailsPage.overviewTab.getTransactionTypeFilter()).toHaveValue(
          'Worker'
        );
      });

      await test.step('Click Transactions tab and verify type persists', async () => {
        await serviceDetailsPage.transactionsTab.clickTab();
        await expect(serviceDetailsPage.overviewTab.getTransactionTypeFilter()).toHaveValue(
          'Worker'
        );
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
        await expect(serviceDetailsPage.overviewTab.getTransactionTypeFilter()).toHaveValue(
          'Worker'
        );
      });

      await test.step('Click View transactions link and verify type persists', async () => {
        await serviceDetailsPage.overviewTab.clickViewTransactionsLink();
        await expect(serviceDetailsPage.overviewTab.getTransactionTypeFilter()).toHaveValue(
          'Worker'
        );
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
      pageObjects: { serviceDetailsPage, datePicker },
    }) => {
      // Typed into the picker, so it uses the picker's display format. Moves the
      // start 5 minutes later than testData.START_DATE.
      const newStart = 'Oct 10, 2021 @ 00:05:00.000';
      const newEnd = 'Oct 10, 2021 @ 00:15:00.000';

      await serviceDetailsPage.overviewTab.goToTab({
        serviceName: testData.SERVICE_OPBEANS_NODE,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });

      await test.step('Wait for the time picker to be ready', async () => {
        await waitForSearchBarReady(page);
      });

      await test.step('Change the time range through the time picker', async () => {
        await datePicker.setAbsoluteRange({ from: newStart, to: newEnd });
      });

      await test.step('Verify URL reflects the new time range', async () => {
        await expect
          .poll(() => new URL(page.url()).searchParams.get('rangeFrom'), {
            timeout: EXTENDED_TIMEOUT,
          })
          .not.toBe(testData.START_DATE);
      });

      await test.step('Verify content reloads for the new time range', async () => {
        await expect(serviceDetailsPage.overviewTab.latencyChart).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        await expect(serviceDetailsPage.overviewTab.throughputChart).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });
    });
  }
);
