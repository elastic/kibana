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

const MOST_USED_CHARTS = [
  'mostUsedChart-device',
  'mostUsedChart-netConnectionType',
  'mostUsedChart-osVersion',
  'mostUsedChart-appVersion',
];

test.describe(
  'Mobile Service Overview - Most used charts',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { serviceDetailsPage } }) => {
      await browserAuth.loginAsViewer();
      await serviceDetailsPage.goToMobileServiceOverview(testData.SERVICE_MOBILE_MOST_USED, {
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });
    });

    test('shows the most used charts', async ({ page }) => {
      for (const chart of MOST_USED_CHARTS) {
        await expect(page.getByTestId(chart)).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      }
    });

    test('shows "No results found" when the selected range has no data', async ({
      page,
      pageObjects: { serviceDetailsPage },
    }) => {
      // A range well before the seeded data window leaves the charts empty.
      await serviceDetailsPage.goToMobileServiceOverview(testData.SERVICE_MOBILE_MOST_USED, {
        rangeFrom: '2019-01-01T00:00:00.000Z',
        rangeTo: '2019-01-01T00:15:00.000Z',
      });

      await expect(
        page.getByTestId('mostUsedChart-device').getByTestId('mostUsedNoResultsFound')
      ).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    });
  }
);
