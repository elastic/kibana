/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

const MOBILE_TRANSACTION_NAME = 'Start View - View Appearing';

test.describe(
  'Mobile transaction details page',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { mobileTransactionsPage } }) => {
      await browserAuth.loginAsViewer();
      await mobileTransactionsPage.gotoTransactionDetails(
        testData.SERVICE_MOBILE_MOST_USED,
        MOBILE_TRANSACTION_NAME,
        {
          rangeFrom: testData.START_DATE,
          rangeTo: testData.END_DATE,
        }
      );
    });

    test('opens the action menu popup when clicking the investigate button', async ({
      pageObjects: { mobileTransactionsPage },
    }) => {
      await mobileTransactionsPage.investigateButton.waitFor({
        state: 'visible',
        timeout: EXTENDED_TIMEOUT,
      });
      await mobileTransactionsPage.investigateButton.click();
      await expect(mobileTransactionsPage.investigatePopup).toBeVisible();
    });
  }
);
