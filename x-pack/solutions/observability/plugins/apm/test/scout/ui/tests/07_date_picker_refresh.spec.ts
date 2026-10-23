/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';
import { clickSearchBarRefresh, readResolvedDateRange } from '../fixtures/page_helpers';

const FAST_FORWARD_MINUTES = 5;

// Matches the absolute timestamps of both picker variants' tooltips:
// "Oct 10, 2021, 00:15:00.000" (DateRangePicker) and "Oct 10, 2021 @ 00:15:00.000" (legacy).
const ABSOLUTE_TIMESTAMP = /[A-Z][a-z]{2} \d{1,2}, \d{4}(?:,| @) \d{2}:\d{2}:\d{2}\.\d{3}/g;

/**
 * Parses the end bound of a resolved range tooltip into epoch milliseconds. Scout runs the
 * browser in GMT, so the displayed timestamps are UTC.
 */
function parseResolvedEnd(resolvedRange: string): number {
  const timestamps = resolvedRange.match(ABSOLUTE_TIMESTAMP) ?? [];
  const end = timestamps[timestamps.length - 1] ?? '';
  return moment.utc(end.replace(' @ ', ', '), 'MMM D, YYYY, HH:mm:ss.SSS', true).valueOf();
}

test.describe(
  'APM date picker refresh',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    // Regression guard for #295001: with a relative range, Refresh refetches the data for a
    // new "now" but the picker kept displaying the absolute bounds it resolved on page load.
    test('advances the resolved absolute range on Refresh while keeping the relative range', async ({
      page,
      pageObjects: { serviceInventoryPage },
    }) => {
      let resolvedEndBeforeRefresh = 0;

      await test.step('open the service inventory with a relative range covering the data', async () => {
        // Start the browser clock at the end of the ingested window so `now-15m` -> `now` covers it.
        await page.clock.install({ time: new Date(testData.END_DATE) });
        await serviceInventoryPage.gotoServiceInventory({ rangeFrom: 'now-15m', rangeTo: 'now' });
        await expect(
          serviceInventoryPage.getServiceLink(testData.SERVICE_OPBEANS_NODE)
        ).toBeVisible({ timeout: testData.EXTENDED_TIMEOUT });

        const resolvedRange = await readResolvedDateRange(page);
        resolvedEndBeforeRefresh = parseResolvedEnd(resolvedRange);
        expect(resolvedRange).toMatch(ABSOLUTE_TIMESTAMP);
        expect(resolvedEndBeforeRefresh).toBeGreaterThanOrEqual(
          new Date(testData.END_DATE).getTime()
        );
      });

      await test.step('advance the clock and click Refresh', async () => {
        await page.clock.fastForward(`0${FAST_FORWARD_MINUTES}:00`);
        await clickSearchBarRefresh(page);
      });

      await test.step('the displayed absolute range advanced and the URL kept the relative range', async () => {
        await expect
          .poll(async () => parseResolvedEnd(await readResolvedDateRange(page)))
          .toBeGreaterThanOrEqual(resolvedEndBeforeRefresh + FAST_FORWARD_MINUTES * 60_000);

        await expect(page).toHaveURL(/rangeFrom=now-15m&rangeTo=now/);
        await expect(
          serviceInventoryPage.getServiceLink(testData.SERVICE_OPBEANS_NODE)
        ).toBeVisible();
      });
    });
  }
);
