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

test.describe(
  'Home page',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('Redirects to service page with comparisonEnabled, environment, rangeFrom, rangeTo and offset added to the URL', async ({
      page,
      kbnUrl,
    }) => {
      await page.goto(`${kbnUrl.app('apm')}`);
      await expect(page).toHaveURL(/\/apm\/services/);
      await expect(page).toHaveURL(/comparisonEnabled=true/);
      await expect(page).toHaveURL(/environment=ENVIRONMENT_ALL/);
      await expect(page).toHaveURL(/offset=1d/);
    });

    test('includes services with only metric documents', async ({ page, kbnUrl }) => {
      const serviceInventoryHref = `${kbnUrl.app(
        'apm'
      )}/services?comparisonEnabled=true&environment=ENVIRONMENT_ALL&rangeFrom=${
        testData.START_DATE
      }&rangeTo=${testData.END_DATE}&offset=1d&kuery=${encodeURIComponent(
        'not (processor.event:"transaction")'
      )}`;
      await page.goto(serviceInventoryHref);
      await page
        .getByTestId('apmUnifiedSearchBar')
        .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
      await expect(page.getByText(testData.SERVICE_OPBEANS_JAVA)).toBeVisible();
      await expect(page.getByText(testData.SERVICE_OPBEANS_NODE)).toBeVisible();
    });

    test('navigates to service overview page with transaction type', async ({ page, kbnUrl }) => {
      const serviceInventoryHref = `${kbnUrl.app(
        'apm'
      )}/services?comparisonEnabled=true&environment=ENVIRONMENT_ALL&rangeFrom=${
        testData.START_DATE
      }&rangeTo=${testData.END_DATE}&offset=1d`;
      await page.goto(serviceInventoryHref);
      await page
        .getByRole('heading', { name: 'Service inventory', level: 1 })
        .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
      await page.getByRole('link', { name: testData.SERVICE_OPBEANS_RUM }).click();
      await expect(page.getByTestId('headerFilterTransactionType')).toBeVisible();
      await expect(page.getByTestId('headerFilterTransactionType')).toHaveValue('page-load');
    });
  }
);
