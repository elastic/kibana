/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';

const DEPENDENCY_NAME = 'postgresql';
const SPAN_NAME = 'SELECT * FROM product';

const gotoParams = {
  dependencyName: DEPENDENCY_NAME,
  spanName: SPAN_NAME,
  start: testData.OPBEANS_START_DATE,
  end: testData.OPBEANS_END_DATE,
};

test.describe('Dependency Operation Detail Page', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { dependencyDetailsPage } }) => {
    await browserAuth.loginAsViewer();
    await dependencyDetailsPage.gotoOperationDetail(gotoParams);
  });

  test('Renders expected content', async ({ page, pageObjects: { dependencyDetailsPage } }) => {
    await test.step('Renders operation detail content', async () => {
      await expect(page.getByRole('heading', { name: SPAN_NAME })).toBeVisible();
      await dependencyDetailsPage.expectLatencyChartVisible();
      await dependencyDetailsPage.expectThroughputChartVisible();
      await dependencyDetailsPage.expectFailedTransactionRateChartVisible();
      await dependencyDetailsPage.expectCorrelationsChartVisible();
      await dependencyDetailsPage.expectWaterfallVisible();
    });
  });
});
