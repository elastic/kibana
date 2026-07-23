/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

const TABS = [
  { testSubj: 'apmAppVersionTab', selectedTab: 'app_version_tab' },
  { testSubj: 'apmOsVersionTab', selectedTab: 'os_version_tab' },
  { testSubj: 'apmDevicesTab', selectedTab: 'devices_tab' },
];

test.describe(
  'Mobile transactions page',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { mobileTransactionsPage } }) => {
      await browserAuth.loginAsViewer();
      await mobileTransactionsPage.gotoTransactions(testData.SERVICE_MOBILE_MOST_USED, {
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });
    });

    test('shows the correct table for each tab when clicking on it', async ({
      page,
      pageObjects: { mobileTransactionsPage },
    }) => {
      for (const { testSubj, selectedTab } of TABS) {
        await test.step(`select the ${selectedTab} tab`, async () => {
          await mobileTransactionsPage.clickTab(testSubj);
          await expect(mobileTransactionsPage.getTab(testSubj)).toHaveAttribute(
            'aria-selected',
            'true'
          );
          await expect(page).toHaveURL(new RegExp(`mobileSelectedTab=${selectedTab}`));
        });
      }
    });
  }
);
