/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';

test.describe('Dependency Operation Detail Page', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { dependencyDetailsPage } }) => {
    await browserAuth.loginAsViewer();
    await dependencyDetailsPage.gotoOperationDetail();
  });

  test('Renders expected content', async ({ page, pageObjects: { dependencyDetailsPage } }) => {
    await test.step('Renders operation detail content', async () => {
      await expect(
        page.getByRole('heading', { name: dependencyDetailsPage.SPAN_NAME })
      ).toBeVisible();
      await expect(dependencyDetailsPage.operationDetailLatencyChart).toBeVisible();
      await expect(dependencyDetailsPage.operationDetailThroughputChart).toBeVisible();
      await expect(dependencyDetailsPage.operationDetailFailedTransactionRateChart).toBeVisible();
      await expect(dependencyDetailsPage.operationDetailCorrelationsChart).toBeVisible();
      await expect(dependencyDetailsPage.operationDetailWaterfallInvestigateButton).toBeVisible();
    });
  });

  test('Links back to dependency operations list', async ({
    page,
    pageObjects: { dependencyDetailsPage },
  }) => {
    await test.step('Click breadcrumb link to go back to dependency operations list', async () => {
      await expect(dependencyDetailsPage.operationDetailBreadcrumb).toBeVisible();
      await expect(dependencyDetailsPage.operationDetailBreadcrumb).toHaveText('All operations');
      await dependencyDetailsPage.operationDetailBreadcrumb.click();
    });

    await test.step("Verify we're on the dependency operations list page", () => {
      const url = new URL(page.url());
      expect(url.pathname).toContain(`/dependencies/operations`);
      expect(url.searchParams.get('dependencyName')).toBe(dependencyDetailsPage.DEPENDENCY_NAME);
    });
  });

  test("Investigate trace popup opens when clicking 'Investigate trace' button", async ({
    pageObjects: { dependencyDetailsPage },
  }) => {
    await test.step("Click 'Investigate trace' button", async () => {
      await dependencyDetailsPage.operationDetailWaterfallInvestigateButton.click();
    });

    await test.step('Verify investigate trace popup is visible', async () => {
      await expect(dependencyDetailsPage.operationDetailWaterfallInvestigatePopup).toBeVisible();
    });
  });

  test("Span link flyout opens when clicking 'Span links' button", async ({
    page,
    pageObjects: { dependencyDetailsPage },
  }) => {
    await test.step("Click 'Span links' button", async () => {
      await dependencyDetailsPage.operationDetailWaterfallPaginationLastButton.click();
      await dependencyDetailsPage.operationDetailWaterfallSpanLinksBadge.click();
    });

    await test.step('Verify span link flyout is visible', async () => {
      const flyoutLocator = page.getByRole('dialog');
      await expect(flyoutLocator).toBeVisible();
      await expect(flyoutLocator.getByRole('heading', { name: 'Span details' })).toBeVisible();
    });
  });

  test('Has no detectable a11y violations on load', async ({ page }) => {
    const { violations } = await page.checkA11y({ include: ['main'] });
    expect(violations).toHaveLength(0);
  });
});
