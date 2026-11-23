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

// Re-implemented from the previously skipped Cypress suite (issue #191961). We
// keep the stable comparison-control behaviors and drop the flaky chart-hover
// and request-shape assertions, which are better covered at the API layer.
test.describe(
  'Service Overview - Time Comparison',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('enables comparison by default with the day-before offset', async ({
      page,
      pageObjects: { serviceDetailsPage },
    }) => {
      await serviceDetailsPage.overviewTab.goToTab({
        serviceName: testData.SERVICE_OPBEANS_JAVA,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });

      await expect(serviceDetailsPage.overviewTab.getComparisonSelect()).toHaveValue('1d', {
        timeout: EXTENDED_TIMEOUT,
      });
      expect(page.url()).toContain('comparisonEnabled=true');
      expect(page.url()).toContain('offset=1d');
    });

    test('changes the comparison type', async ({ pageObjects: { serviceDetailsPage } }) => {
      await serviceDetailsPage.overviewTab.goToTab({
        serviceName: testData.SERVICE_OPBEANS_JAVA,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });

      const comparisonSelect = serviceDetailsPage.overviewTab.getComparisonSelect();
      await expect(comparisonSelect).toHaveValue('1d', { timeout: EXTENDED_TIMEOUT });
      await comparisonSelect.selectOption('1w');
      await expect(comparisonSelect).toHaveValue('1w');
    });

    test('toggling comparison off disables the comparison select', async ({
      page,
      pageObjects: { serviceDetailsPage },
    }) => {
      await serviceDetailsPage.overviewTab.goToTab({
        serviceName: testData.SERVICE_OPBEANS_JAVA,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });

      const comparisonSelect = serviceDetailsPage.overviewTab.getComparisonSelect();
      await expect(comparisonSelect).toBeEnabled({ timeout: EXTENDED_TIMEOUT });

      await page.locator('input#comparison[type="checkbox"]').click();
      await expect(comparisonSelect).toBeDisabled();
    });
  }
);
