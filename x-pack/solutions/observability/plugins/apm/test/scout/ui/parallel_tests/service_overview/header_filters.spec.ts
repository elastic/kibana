/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

const specialServiceName = 'service 1 / ? # [ ] @ ! $ &  ( ) * + , ; = < > % {} | ^ ` <>';

test.describe('Service overview - header filters', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('Filtering by transaction type - changes url when selecting different value', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await test.step('Navigate to service overview', async () => {
      await serviceDetailsPage.overviewTab.goToTab({
        serviceName: testData.SERVICE_OPBEANS_NODE,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });
    });

    await test.step('Verify service name is visible and initial state', async () => {
      await expect(serviceDetailsPage.overviewTab.getTransactionTypeFilter()).toHaveValue(
        'request'
      );
    });

    await test.step('Select Worker transaction type', async () => {
      await serviceDetailsPage.overviewTab.selectTransactionType('Worker');
    });

    await test.step('Verify URL and filter value updated', async () => {
      await page.waitForURL(/transactionType=Worker/);
      expect(page.url()).toContain('transactionType=Worker');
      await expect(serviceDetailsPage.overviewTab.getTransactionTypeFilter()).toHaveValue('Worker');
    });
  });

  test('Filtering by searchbar - filters by service.name with special characters', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await test.step('Navigate to special service overview', async () => {
      await serviceDetailsPage.overviewTab.goToTab({
        serviceName: testData.SERVICE_OPBEANS_NODE,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });
    });

    await test.step('Verify service name is visible', async () => {
      await expect(page.getByTestId('apmMainTemplateHeaderServiceName')).toHaveText(
        testData.SERVICE_OPBEANS_NODE
      );
      await expect(page.getByTestId('instanceActionsButton_opbeans-node-prod-1')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    });

    await test.step('Filter by service.name with special characters', async () => {
      const searchBar = page.getByTestId('apmUnifiedSearchBar');
      await expect(searchBar).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      await expect(searchBar).toHaveValue('');
      await searchBar.fill(`service.name: "${specialServiceName}"`);
      await expect(searchBar).toHaveValue(`service.name: "${specialServiceName}"`);
      await expect(page.getByTestId('querySubmitButton')).toHaveText('Update');
      await searchBar.press('Enter');
    });

    await test.step('Verify URL contains special service name', async () => {
      await expect(page.getByTestId('querySubmitButton')).toHaveText('Refresh');

      await expect(page.getByTestId('transactionBreakdownChart')).toHaveText('No data to display', {
        timeout: EXTENDED_TIMEOUT,
      });

      await page.waitForURL(
        (url) => {
          return url.toString().includes(encodeURIComponent(specialServiceName));
        },
        { timeout: EXTENDED_TIMEOUT }
      );

      expect(page.url()).toContain(encodeURIComponent(specialServiceName));
    });
  });
});
