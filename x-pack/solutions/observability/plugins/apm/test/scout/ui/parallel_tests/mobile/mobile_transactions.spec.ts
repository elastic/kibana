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
  'Mobile transactions page',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('when click on tab it shows the correct table for each tab', async ({ page, kbnUrl }) => {
      const mobileTransactionsPageHref = `${kbnUrl.app(
        'apm'
      )}/mobile-services/synth-android/transactions?rangeFrom=${testData.START_DATE}&rangeTo=${
        testData.END_DATE
      }`;
      await page.goto(mobileTransactionsPageHref);
      await page.getByTestId('kbnAppWrapper').waitFor({ state: 'visible' });

      await page.getByTestId('apmAppVersionTab').click();
      await expect(page.getByTestId('apmAppVersionTab')).toHaveAttribute('aria-selected', 'true');
      await expect(page).toHaveURL(/mobileSelectedTab=app_version_tab/);

      await page.getByTestId('apmOsVersionTab').click();
      await expect(page.getByTestId('apmOsVersionTab')).toHaveAttribute('aria-selected', 'true');
      await expect(page).toHaveURL(/mobileSelectedTab=os_version_tab/);

      await page.getByTestId('apmDevicesTab').click();
      await expect(page.getByTestId('apmDevicesTab')).toHaveAttribute('aria-selected', 'true');
      await expect(page).toHaveURL(/mobileSelectedTab=devices_tab/);
    });
  }
);
