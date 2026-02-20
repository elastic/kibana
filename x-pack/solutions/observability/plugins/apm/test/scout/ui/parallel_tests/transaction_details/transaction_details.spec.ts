/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

test.describe(
  'Transaction details',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { transactionDetailsPage } }) => {
      await browserAuth.loginAsViewer();
      await transactionDetailsPage.goToTransactionDetails({
        serviceName: testData.SERVICE_OPBEANS_JAVA,
        transactionName: testData.PRODUCT_TRANSACTION_NAME,
        start: testData.START_DATE,
        end: testData.END_DATE,
      });
    });

    test('Renders the page with expected content', async ({ page }) => {
      await test.step('Renders headings', async () => {
        await expect(page.getByTestId('apmMainTemplateHeaderServiceName')).toHaveText(
          testData.SERVICE_OPBEANS_JAVA
        );
        await expect(
          page.getByRole('heading', { name: testData.PRODUCT_TRANSACTION_NAME, level: 2 })
        ).toBeVisible();
      });

      await test.step('Renders SLOs callout', async () => {
        await expect(page.getByTestId('apmSloCalloutCreateSloButton')).toBeVisible();
      });

      await test.step('Renders transaction charts', async () => {
        await expect(page.getByTestId('latencyChart')).toBeVisible();
        await expect(page.getByTestId('throughput')).toBeVisible();
        await expect(page.getByTestId('transactionBreakdownChart')).toBeVisible();
        await expect(page.getByTestId('errorRate')).toBeVisible();
      });

      await test.step('Renders top errors table', async () => {
        await expect(page.getByTestId('topErrorsForTransactionTable')).toBeVisible();
        await expect(page.getByTestId('apmErrorDetailsLink')).toContainText(testData.ERROR_MESSAGE);
      });
    });

    test('Trace samples navigation persists across page reloads', async ({
      page,
      pageObjects: { transactionDetailsPage },
    }) => {
      await test.step('Renders traces sample table', async () => {
        await expect(page.getByTestId('apmHttpInfoRequestMethod')).toBeVisible();
        await expect(page.getByTestId('apmHttpInfoUrl')).toBeVisible();
        await expect(page.getByTestId('apmUiSharedHttpStatusCodeBadge')).toBeVisible();
      });

      await test.step('Navigates trace samples', async () => {
        await expect(page.getByTestId('pagination-button-last')).toBeVisible();
        await page.getByTestId('pagination-button-last').click();
      });

      await test.step('Persists current page after reload', async () => {
        const url = page.url();
        await transactionDetailsPage.reload();
        expect(page.url()).toBe(url);
      });
    });

    test('Trace samples waterfall should not become stuck on loading state after page reload with empty data', async ({
      page,
      pageObjects: { transactionDetailsPage },
    }) => {
      await test.step('Waterfall loads with data', async () => {
        await expect(page.getByTestId('apmWaterfallButton')).toBeVisible();
      });

      await test.step('Applies filter that results in no data', async () => {
        await transactionDetailsPage.fillApmUnifiedSearchBar(`_id: "123"`);
        await expect(page.getByTestId('apmWaterfallButton')).toBeHidden();
        await expect(page.getByTestId('apmNoTraceFound')).toBeVisible();
      });

      await test.step('Reloads the page and verifies waterfall is not stuck in loading state', async () => {
        await transactionDetailsPage.reload();
        await expect(page.getByTestId('apmWaterfallButton')).toBeHidden();
        await expect(page.getByTestId('apmNoTraceFound')).toBeVisible();
      });
    });
  }
);
