/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';

test.describe(
  'Dependency Operation Detail Page',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { dependencyDetailsPage } }) => {
      await browserAuth.loginAsViewer();
      await dependencyDetailsPage.operationDetailSubpage.goToPage();
    });

    test('Renders expected content', async ({ page, pageObjects: { dependencyDetailsPage } }) => {
      await test.step('renders operation detail content', async () => {
        await expect(
          page.getByRole('heading', { name: dependencyDetailsPage.SPAN_NAME })
        ).toBeVisible();
        await expect(dependencyDetailsPage.operationDetailSubpage.latencyChart).toBeVisible();
        await expect(dependencyDetailsPage.operationDetailSubpage.throughputChart).toBeVisible();
        await expect(
          dependencyDetailsPage.operationDetailSubpage.failedTransactionRateChart
        ).toBeVisible();
        await expect(dependencyDetailsPage.operationDetailSubpage.correlationsChart).toBeVisible();
        await expect(
          dependencyDetailsPage.operationDetailSubpage.waterfallInvestigateButton
        ).toBeVisible();
      });
    });

    test('Links back to dependency operations list', async ({
      page,
      pageObjects: { dependencyDetailsPage },
    }) => {
      await test.step('click breadcrumb link to go back to dependency operations list', async () => {
        await expect(dependencyDetailsPage.operationDetailSubpage.breadcrumb).toBeVisible();
        await expect(dependencyDetailsPage.operationDetailSubpage.breadcrumb).toHaveText(
          'All operations'
        );
        await dependencyDetailsPage.operationDetailSubpage.breadcrumb.click();
      });

      await test.step("verify we're on the dependency operations list page", () => {
        const url = new URL(page.url());
        expect(url.pathname).toContain(`/dependencies/operations`);
        expect(url.searchParams.get('dependencyName')).toBe(dependencyDetailsPage.DEPENDENCY_NAME);
      });
    });

    test("Investigate trace popup opens when clicking 'Investigate trace' button", async ({
      pageObjects: { dependencyDetailsPage },
    }) => {
      await test.step("click 'Investigate trace' button", async () => {
        await dependencyDetailsPage.operationDetailSubpage.waterfallInvestigateButton.click();
      });

      await test.step('verify investigate trace popup is visible', async () => {
        await expect(
          dependencyDetailsPage.operationDetailSubpage.waterfallInvestigatePopup
        ).toBeVisible();
      });
    });

    test("Span link flyout opens when clicking 'Span links' button", async ({
      page,
      pageObjects: { dependencyDetailsPage },
    }) => {
      await test.step("click 'Span links' button", async () => {
        await dependencyDetailsPage.operationDetailSubpage.waterfallPaginationLastButton.click();
        await dependencyDetailsPage.operationDetailSubpage.waterfallSpanLinksBadge.click();
      });

      await test.step('verify span link flyout is visible', async () => {
        const flyoutLocator = page.getByRole('dialog');
        await expect(flyoutLocator).toBeVisible();
        await expect(flyoutLocator.getByRole('heading', { name: 'Span details' })).toBeVisible();
      });
    });

    test('Has no detectable a11y violations on load', async ({ page }) => {
      const { violations } = await page.checkA11y({ include: ['main'] });
      expect(violations).toHaveLength(0);
    });
  }
);
