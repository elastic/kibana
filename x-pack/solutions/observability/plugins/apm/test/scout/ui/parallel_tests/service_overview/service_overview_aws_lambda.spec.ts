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
  'Service Overview - AWS Lambda',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('displays cold start rate chart and not transaction breakdown chart', async ({
      pageObjects: { serviceDetailsPage },
    }) => {
      await serviceDetailsPage.overviewTab.goToTab({
        serviceName: testData.SERVICE_AWS_LAMBDA,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });

      await test.step('Wait for cold start rate chart to load', async () => {
        await expect(serviceDetailsPage.overviewTab.coldstartRateChart).toBeVisible({
          timeout: 10000,
        });
      });

      await test.step('Verify Cold start rate heading is visible', async () => {
        await serviceDetailsPage.overviewTab.coldstartRateChartTitle.scrollIntoViewIfNeeded();
        await expect(serviceDetailsPage.overviewTab.coldstartRateChartTitle).toBeVisible();
      });

      await test.step('Verify transaction breakdown chart is not shown', async () => {
        await expect(serviceDetailsPage.overviewTab.transactionBreakdownChart).toBeHidden();
      });
    });
  }
);
