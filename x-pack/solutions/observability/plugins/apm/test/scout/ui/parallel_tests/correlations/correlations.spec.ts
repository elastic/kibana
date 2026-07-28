/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';
import { EXTENDED_TIMEOUT, PRODUCT_TRANSACTION_NAME } from '../../fixtures/constants';

// The legacy FTR suites loaded a heavy esArchiver fixture; here we reuse the
// shared opbeans synthtrace data. The small dataset deterministically yields
// "No significant correlations", matching the original assertions.
test.describe(
  'Correlations',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { transactionDetailsPage } }) => {
      await browserAuth.loginAsViewer();
      await transactionDetailsPage.goToTransactionDetails({
        serviceName: testData.SERVICE_OPBEANS_JAVA,
        transactionName: PRODUCT_TRANSACTION_NAME,
        start: testData.START_DATE,
        end: testData.END_DATE,
      });
    });

    test('shows the latency correlations results', async ({
      pageObjects: { correlationsPage },
    }) => {
      await test.step('open the latency correlations tab', async () => {
        await correlationsPage.latencyTabButton.click();
        await expect(correlationsPage.latencyTabContent).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });

      await test.step('analysis completes and reports no significant correlations', async () => {
        await correlationsPage.waitForProgressComplete();
        await expect(correlationsPage.correlationsTable).toContainText(
          'No significant correlations',
          { timeout: EXTENDED_TIMEOUT }
        );
      });
    });

    test('shows the failed transaction correlations results', async ({
      pageObjects: { correlationsPage },
    }) => {
      await test.step('open the failed transaction correlations tab', async () => {
        await correlationsPage.failedTransactionsTabButton.click();
        await expect(correlationsPage.failedTransactionsTabContent).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });

      await test.step('analysis completes and reports no significant correlations', async () => {
        await correlationsPage.waitForProgressComplete();
        await expect(correlationsPage.correlationsTable).toContainText(
          'No significant correlations',
          { timeout: EXTENDED_TIMEOUT }
        );
      });
    });
  }
);
