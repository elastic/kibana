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
  'Errors table',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('errors table is populated', async ({ page, pageObjects: { serviceDetailsPage } }) => {
      await serviceDetailsPage.overviewTab.goToTab({
        serviceName: testData.SERVICE_OPBEANS_JAVA,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });
      await expect(page.getByTestId('apmMainTemplateHeaderServiceName')).toHaveText(
        testData.SERVICE_OPBEANS_JAVA
      );
      await expect(page.getByText(testData.ERROR_MESSAGE)).toBeVisible();
    });

    test('navigates to the errors page', async ({ page, pageObjects: { serviceDetailsPage } }) => {
      await serviceDetailsPage.overviewTab.goToTab({
        serviceName: testData.SERVICE_OPBEANS_JAVA,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });
      await page.getByRole('link', { name: 'View errors' }).click();
      await expect(page).toHaveURL(new RegExp(`/${testData.SERVICE_OPBEANS_JAVA}/errors`));
    });

    test('clicking on type adds a filter in the kuerybar and navigates to errors page', async ({
      page,
      pageObjects: { serviceDetailsPage },
    }) => {
      await serviceDetailsPage.overviewTab.goToTab({
        serviceName: testData.SERVICE_OPBEANS_JAVA,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });
      await expect(page.getByTestId('apmUnifiedSearchBar')).toBeVisible();
      await page.getByRole('cell', { name: 'Exception' }).getByRole('link').click();
      await expect(page.getByTestId('apmUnifiedSearchBar')).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Exception' })).toHaveCount(1);
    });

    test('navigates to error detail page', async ({
      page,
      pageObjects: { serviceDetailsPage },
    }) => {
      await serviceDetailsPage.overviewTab.goToTab({
        serviceName: testData.SERVICE_OPBEANS_JAVA,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });
      await page.getByRole('link', { name: testData.ERROR_MESSAGE }).click();
      await expect(page.getByText('Exception message')).toBeVisible({ timeout: EXTENDED_TIMEOUT });
    });
  }
);
