/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';
import { ENVIRONMENT_ALL, EXTENDED_TIMEOUT } from '../fixtures/constants';

test.describe('APM home page', { tag: tags.stateful.classic }, () => {
  // `observability:enableComparisonByDefault` controls whether the APM root
  // redirect appends `comparisonEnabled=true`. It is a global advanced setting;
  // the sequential lane (workers: 1) guarantees no sibling suite reads or writes
  // it while this suite has it enabled. We reset it afterwards.
  test.beforeAll(async ({ uiSettings }) => {
    await uiSettings.set({ 'observability:enableComparisonByDefault': true });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test.afterAll(async ({ uiSettings }) => {
    await uiSettings.unset('observability:enableComparisonByDefault');
  });

  test('redirects the APM root to the service inventory with default query params', async ({
    page,
    pageObjects: { navigationPage },
  }) => {
    await navigationPage.gotoApm();

    await page.waitForURL(
      /app\/apm\/services\?comparisonEnabled=true&environment=ENVIRONMENT_ALL&rangeFrom=now-15m&rangeTo=now&offset=1d/,
      { timeout: EXTENDED_TIMEOUT }
    );

    await expect(page).toHaveURL(
      /app\/apm\/services\?comparisonEnabled=true&environment=ENVIRONMENT_ALL&rangeFrom=now-15m&rangeTo=now&offset=1d/
    );
  });

  test.setTimeout(120000);
  test('includes services that only have metric documents', async ({
    page,
    pageObjects: { serviceInventoryPage },
  }) => {
    await serviceInventoryPage.gotoServiceInventory({
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });

    await page.testSubj.fill('apmUnifiedSearchBar', 'not (processor.event:"transaction")');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');

    await expect(page.getByText(testData.SERVICE_OPBEANS_JAVA)).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
    });
    await expect(page.getByText(testData.SERVICE_OPBEANS_NODE)).toBeVisible();
  });

  test('navigates to the service overview with its transaction type', async ({
    page,
    pageObjects: { serviceInventoryPage },
  }) => {
    await serviceInventoryPage.gotoServiceInventory({
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
      environment: ENVIRONMENT_ALL,
    });

    await serviceInventoryPage.clickServiceLink(testData.SERVICE_OPBEANS_RUM);

    await expect(page.getByTestId('headerFilterTransactionType')).toHaveValue('page-load');
  });
});
