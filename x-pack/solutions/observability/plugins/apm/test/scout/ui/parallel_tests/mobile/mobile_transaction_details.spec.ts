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
  'Mobile transaction details page',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('opens the action menu popup when clicking the investigate button', async ({
      page,
      kbnUrl,
    }) => {
      const mobileTransactionDetailsPageHref = `${kbnUrl.app('apm')}/mobile-services/synth-android/transactions/view?rangeFrom=${testData.START_DATE}&rangeTo=${testData.END_DATE}&transactionName=${encodeURIComponent('Start View - View Appearing')}`;
      await page.goto(mobileTransactionDetailsPageHref);
      await page.getByTestId('apmActionMenuButtonInvestigateButton').click();
      await expect(page.getByTestId('apmActionMenuInvestigateButtonPopup')).toBeVisible();
    });
  }
);
