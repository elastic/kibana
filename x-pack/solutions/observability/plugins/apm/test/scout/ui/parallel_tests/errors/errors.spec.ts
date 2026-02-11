/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateLongIdWithSeed } from '@kbn/synthtrace-client/src/lib/utils/generate_id';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

test.describe('Errors', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('shows "No errors found" message when a service has no errors', async ({
    page,
    pageObjects: { errorsPage },
  }) => {
    await errorsPage.gotoServiceErrorsPage(
      testData.SERVICE_OPBEANS_NODE,
      testData.START_DATE,
      testData.END_DATE
    );

    await test.step('shows empty message when service has no errors', async () => {
      await expect(page.getByTestId('apmMainTemplateHeaderServiceName')).toHaveText(
        testData.SERVICE_OPBEANS_NODE
      );
      await expect(page.locator('td').getByTestId('apmErrorGroupListEmptyState')).toBeVisible({
        timeout: testData.EXTENDED_TIMEOUT,
      });
    });
  });

  test('shows errors charts and table when a service has errors', async ({
    page,
    pageObjects: { errorsPage },
  }) => {
    await errorsPage.gotoServiceErrorsPage(
      testData.SERVICE_OPBEANS_JAVA,
      testData.START_DATE,
      testData.END_DATE
    );

    await test.step('shows failed transaction rate and error occurrences charts', async () => {
      await expect(
        page.getByRole('heading', { name: 'Failed transaction rate', level: 2 })
      ).toBeVisible();
      await expect(page.getByTestId('errorDistribution')).toBeVisible();
      await expect(page.getByTestId('errorRate')).toBeVisible();
    });

    await test.step('errors table is populated', async () => {
      await errorsPage.waitForErrorsTableToLoad();
      await expect(page.getByText(testData.ERROR_MESSAGE)).toBeVisible();
    });

    await test.step('clicking on type adds a filter in the searchbar', async () => {
      await expect(page.getByTestId('apmUnifiedSearchBar')).toHaveValue('');
      await page.locator('td').filter({ hasText: 'Exception' }).locator('a').click();
      await expect(page.getByTestId('apmUnifiedSearchBar')).not.toHaveValue('');
    });

    await test.step('sorting by occurrences updates URL', async () => {
      await page
        .getByTestId('tableHeaderCell_occurrences_5')
        .getByTestId('tableHeaderSortButton')
        .click();
      expect(page.url()).toContain('sortField=occurrences');
      expect(page.url()).toContain('sortDirection=asc');
    });

    await test.step('sorting by last seen updates URL', async () => {
      await page
        .getByTestId('tableHeaderCell_lastSeen_4')
        .getByTestId('tableHeaderSortButton')
        .click();
      expect(page.url()).toContain('sortField=lastSeen');
      expect(page.url()).toContain('sortDirection=asc');
    });

    await test.step('navigates to error detail page when clicking on an error in the list', async () => {
      await page.getByRole('link', { name: testData.ERROR_MESSAGE }).click();
      await expect(
        page.getByText(`Error group ${testData.ERROR_GROUPING_KEY_SHORT}`)
      ).toBeVisible();
      expect(page.url()).toContain(
        `services/${testData.SERVICE_OPBEANS_JAVA}/errors/00000000000000000[MockError]%20Foo`
      );
    });
  });

  test('shows error details page', async ({ page, pageObjects: { errorsPage } }) => {
    await errorsPage.gotoErrorDetailsPage(
      testData.SERVICE_OPBEANS_JAVA,
      testData.ERROR_GROUPING_KEY,
      testData.START_DATE,
      testData.END_DATE
    );

    await test.step('shows error group header', async () => {
      await expect(
        page.getByText(`Error group ${testData.ERROR_GROUPING_KEY_SHORT}`)
      ).toBeVisible();
    });

    await test.step('shows errors distribution chart', async () => {
      await errorsPage.waitForErrorDistributionChartToLoad();
      await expect(page.getByTestId('errorDistribution')).toContainText('Error occurrences');
    });

    await test.step('shows top erroneous transactions table', async () => {
      await expect(page.getByText('Top 5 affected transactions')).toBeVisible();
      await expect(page.getByTestId('topErroneousTransactionsTable')).toBeVisible();
      await expect(
        page
          .getByTestId('topErroneousTransactionsTable')
          .getByText(testData.PRODUCT_TRANSACTION_NAME)
      ).toBeVisible();
    });

    await test.step('shows Stacktrace and Metadata tabs', async () => {
      await expect(page.getByRole('tab', { name: 'Exception stack trace' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Metadata' })).toBeVisible();
    });

    await test.step('clicking on affected transaction navigates to transaction details', async () => {
      await page
        .getByTestId('topErroneousTransactionsTable')
        .getByTestId('apmTransactionDetailLinkLink')
        .click();
      expect(page.url()).toContain(`${testData.SERVICE_OPBEANS_JAVA}/transactions/view`);
    });
  });

  test('shows zero occurrences for non-existent error', async ({
    page,
    pageObjects: { errorsPage },
  }) => {
    const nonExistentErrorKey = generateLongIdWithSeed('Error that does not exist');

    await errorsPage.gotoErrorDetailsPage(
      testData.SERVICE_OPBEANS_JAVA,
      nonExistentErrorKey,
      testData.START_DATE,
      testData.END_DATE
    );

    await test.step('shows zero occurrences badge', async () => {
      await expect(page.getByText('0 occ')).toBeVisible();
    });
  });

  test('redirects to error details page when clicking on an error in the list', async ({
    page,
    pageObjects: { errorsPage },
  }) => {
    await errorsPage.gotoServiceErrorsPage(
      testData.SERVICE_OPBEANS_JAVA,
      testData.START_DATE,
      testData.END_DATE
    );

    await test.step('clicking on an error in the list navigates to error detail page', async () => {
      await errorsPage.waitForErrorsTableToLoad();
      await page.getByRole('link', { name: testData.ERROR_MESSAGE }).click();
      await expect(
        page.getByText(`Error group ${testData.ERROR_GROUPING_KEY_SHORT}`)
      ).toBeVisible();
      expect(page.url()).toContain('/errors/');
      expect(page.url()).toContain(testData.SERVICE_OPBEANS_JAVA);
    });
  });

  test('filters errors table results when typing in the search input', async ({
    page,
    pageObjects: { errorsPage },
  }) => {
    await errorsPage.gotoServiceErrorsPage(
      testData.SERVICE_OPBEANS_JAVA,
      testData.START_DATE,
      testData.END_DATE
    );

    await test.step('table search input is visible', async () => {
      await errorsPage.waitForErrorsTableToLoad();
      await expect(errorsPage.tableSearchInput).toBeVisible();
    });

    await test.step('typing existing error message shows matching result', async () => {
      await expect(page.getByText(testData.ERROR_MESSAGE)).toBeVisible();
      await errorsPage.tableSearchInput.fill('MockError');
      await expect(page.getByText(testData.ERROR_MESSAGE)).toBeVisible();
    });

    await test.step('typing non-matching text hides results', async () => {
      await errorsPage.tableSearchInput.fill('nonexistent error message');
      await expect(page.getByText(testData.ERROR_MESSAGE)).toBeHidden();
      await expect(page.locator('td').getByTestId('apmErrorGroupListEmptyState')).toBeVisible({
        timeout: testData.EXTENDED_TIMEOUT,
      });
    });

    await test.step('clearing the search input shows all errors again', async () => {
      await errorsPage.tableSearchInput.clear();
      await expect(page.getByText(testData.ERROR_MESSAGE)).toBeVisible();
    });
  });
});
