/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';

const timeRange = {
  rangeFrom: testData.LARGE_TRACE_START_DATE,
  rangeTo: testData.LARGE_TRACE_END_DATE,
};

test.describe('Large Trace in waterfall', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('renders waterfall items and shows warning about trace size', async ({
    pageObjects: { transactionDetailsPage },
  }) => {
    await transactionDetailsPage.goto(
      'zzz-synth-rum',
      testData.LARGE_TRACE_TRANSACTION_NAME,
      timeRange
    );

    await test.step('renders waterfall items with virtual list', async () => {
      const waterfallItems = await transactionDetailsPage.getWaterfallItems();
      const itemCount = await waterfallItems.count();
      // Virtual list renders at least some items (not all 15k+ items at once)
      expect(itemCount).toBeGreaterThanOrEqual(15);
    });

    await test.step('shows warning about trace size exceeding maxTraceItems', async () => {
      await expect(transactionDetailsPage.waterfallSizeWarning).toBeVisible();
      const warningText = await transactionDetailsPage.waterfallSizeWarning.textContent();
      expect(warningText).toContain('15551');
      expect(warningText).toContain('5000');
      expect(warningText).toContain('xpack.apm.ui.maxTraceItems');
    });
  });
});
