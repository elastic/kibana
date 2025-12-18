/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { subj } from '@kbn/test-subj-selector';
import { test } from '../../fixtures';

const DEPENDENCY_NAME = 'postgresql';
const SPAN_NAME = 'SELECT * FROM product';

test.describe('Dependency Operation Detail Page', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { dependencyDetailsPage } }) => {
    await browserAuth.loginAsViewer();
    await dependencyDetailsPage.gotoOperationDetail();
  });

  test('Renders expected content', async ({ page, pageObjects: { dependencyDetailsPage } }) => {
    await test.step('Renders operation detail content', async () => {
      await expect(page.getByRole('heading', { name: SPAN_NAME })).toBeVisible();
      await expect(dependencyDetailsPage.operationDetailLatencyChart).toBeVisible();
      await expect(dependencyDetailsPage.operationDetailThroughputChart).toBeVisible();
      await expect(dependencyDetailsPage.operationDetailFailedTransactionRateChart).toBeVisible();
      await expect(dependencyDetailsPage.operationDetailCorrelationsChart).toBeVisible();
      await expect(dependencyDetailsPage.operationDetailWaterfallInvestigateButton).toBeVisible();
    });
  });

  test('Links back to dependency operations list', async ({ page }) => {
    await test.step('Click breadcrumb link to go back to dependency operations list', async () => {
      const breadcrumbLocator = page.getByTestId('apmDetailViewHeaderLink');
      await expect(breadcrumbLocator).toBeVisible();
      await expect(breadcrumbLocator).toHaveText('All operations');
      await breadcrumbLocator.click();
    });

    await test.step("Verify we're on the dependency operations list page", () => {
      const url = new URL(page.url());
      expect(url.pathname).toContain(`/dependencies/operations`);
      expect(url.searchParams.get('dependencyName')).toBe(DEPENDENCY_NAME);
    });
  });

  test("Investigate trace popup opens when clicking 'Investigate trace' button", async ({
    page,
  }) => {
    await test.step("Click 'Investigate trace' button", async () => {
      page.getByTestId('apmActionMenuButtonInvestigateButton').click();
    });

    await test.step('Verify investigate trace popup is visible', async () => {
      await expect(page.getByTestId('apmActionMenuInvestigateButtonPopup')).toBeVisible();
    });
  });

  test("Span link flyout opens when clicking 'Span links' button", async ({ page }) => {
    await test.step("Click 'Span links' button", async () => {
      await page.getByTestId('pagination-button-last').click();
      await page.locator(subj('^spanLinksBadge_')).click();
    });

    await test.step('Verify span link flyout is visible', async () => {
      await expect(page.getByTestId('apmSpanLinksFlyout')).toBeVisible();
      await expect(page.getByTestId('apmSpanLinksFlyout')).toContainText(SPAN_NAME);
    });
  });
});
