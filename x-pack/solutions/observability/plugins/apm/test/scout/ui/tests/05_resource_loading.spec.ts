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

test.describe(
  'APM page navigation resource loading',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('only loads shared resources once when navigating between tabs', async ({
      page,
      pageObjects: { navigationPage },
    }) => {
      // These resources are fetched once and cached across the service detail
      // tabs; navigating between Overview and Errors must not re-request them.
      const countRequests = (pattern: RegExp) => {
        let count = 0;
        page.on('request', (request) => {
          if (pattern.test(request.url())) {
            count += 1;
          }
        });
        return () => count;
      };

      const hasDataRequests = countRequests(/\/internal\/apm\/has_data/);
      const serviceIconsRequests = countRequests(
        /\/internal\/apm\/services\/opbeans-java\/metadata\/icons/
      );
      const apmPoliciesRequests = countRequests(/\/apm\/fleet\/has_apm_policies/);

      await navigationPage.gotoServiceOverview(testData.SERVICE_OPBEANS_JAVA, {
        comparisonEnabled: 'true',
        environment: ENVIRONMENT_ALL,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
        offset: '1d',
      });

      await test.step('overview tab is selected', async () => {
        await expect(page.getByRole('tab', { name: 'Overview', selected: true })).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });

      await test.step('shared resources loaded once', async () => {
        expect(hasDataRequests()).toBe(1);
        expect(serviceIconsRequests()).toBe(1);
        expect(apmPoliciesRequests()).toBe(1);
      });

      await test.step('wait for other tabs to load', async () => {
        await expect(page.getByTestId('transactionsTab')).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        await expect(page.getByTestId('dependenciesTab')).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });

      await test.step('navigate to the errors tab', async () => {
        await page.getByTestId('errorsTab').waitFor({ timeout: EXTENDED_TIMEOUT / 2 });
        await page.getByTestId('errorsTab').click({ timeout: EXTENDED_TIMEOUT / 2 });
        await expect(page.getByTestId('errorsTab')).toHaveAttribute('aria-selected', 'true', {
          timeout: EXTENDED_TIMEOUT,
        });
        await expect(page.getByTestId('errorDistribution')).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });

      await test.step('shared resources are not reloaded', async () => {
        expect(hasDataRequests()).toBe(1);
        expect(serviceIconsRequests()).toBe(1);
        expect(apmPoliciesRequests()).toBe(1);
      });
    });
  }
);
