/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';

test.describe('Service overview - header filters', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('Filtering by transaction type - changes url when selecting different value', async ({
    page,
    pageObjects: { serviceDetailsPage, dependencyDetailsPage },
  }) => {
    await test.step('Navigate to service overview', async () => {
      await serviceDetailsPage.goToPage({
        serviceName: 'opbeans-node',
      });
    });

    await test.step('Verify service name is visible and initial state', async () => {
      await expect(dependencyDetailsPage.overviewTab.getTransactionTypeFilter()).toHaveValue(
        'request'
      );
    });

    await test.step('Select Worker transaction type', async () => {
      await dependencyDetailsPage.overviewTab.selectTransactionType('Worker');
    });

    await test.step('Verify URL and filter value updated', async () => {
      await page.waitForURL(/transactionType=Worker/);
      expect(page.url()).toContain('transactionType=Worker');
      await expect(dependencyDetailsPage.overviewTab.getTransactionTypeFilter()).toHaveValue(
        'Worker'
      );
    });
  });

  test('Filtering by searchbar - filters by transaction.name', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await test.step('Navigate to opbeans-java service overview', async () => {
      await serviceDetailsPage.dependenciesTab.goToTab({
        serviceName: 'opbeans-java',
      });
    });

    await test.step('Verify service name is visible', async () => {
      await expect(page.getByTestId('apmMainTemplateHeaderServiceName')).toHaveText('opbeans-java');
    });

    await test.step('Type transaction.n in searchbar and select autocomplete', async () => {
      const searchBar = page.getByTestId('apmUnifiedSearchBar');
      await searchBar.fill('transaction.n');
      await expect(page.getByText('transaction.name', { exact: true })).toBeVisible();
      await page.getByTestId('autocompleteSuggestion-field-transaction.name-').click();
    });

    await test.step('Type colon and wait for suggestions', async () => {
      const searchBar = page.getByTestId('apmUnifiedSearchBar');
      await searchBar.type(':');

      // Wait for suggestions API call
      await page.waitForResponse((response) =>
        response.url().includes('/internal/kibana/suggestions/values/')
      );
    });

    await test.step('Verify autocomplete suggestions and select value', async () => {
      await expect(page.getByTestId('autoCompleteSuggestionText')).toHaveCount(1);
      await page.getByTestId('autocompleteSuggestion-value-"GET-/api/product"-').click();
    });

    await test.step('Submit search and verify URL contains kuery', async () => {
      const searchBar = page.getByTestId('apmUnifiedSearchBar');
      await searchBar.press('Escape');
      await searchBar.press('Enter');

      // Wait for URL to update with kuery parameter
      await page.waitForURL(/kuery=transaction\.name/);
      expect(page.url()).toContain('&kuery=transaction.name%20:%22GET%20%2Fapi%2Fproduct%22%20');
    });
  });
});
