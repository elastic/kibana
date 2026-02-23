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
  'When navigating between pages',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('should only load certain resources once', async ({ page, kbnUrl }) => {
      const serviceOverviewHref = `${kbnUrl.app('apm')}/services/${
        testData.SERVICE_OPBEANS_JAVA
      }/overview?comparisonEnabled=true&environment=ENVIRONMENT_ALL&rangeFrom=${
        testData.START_DATE
      }&rangeTo=${testData.END_DATE}&offset=1d`;

      const hasDataRequests: string[] = [];
      const serviceIconsRequests: string[] = [];
      const apmPoliciesRequests: string[] = [];

      await page.route('**/internal/apm/has_data**', (route) => {
        hasDataRequests.push(route.request().url());
        return route.continue();
      });
      await page.route('**/internal/apm/services/opbeans-java/metadata/icons**', (route) => {
        serviceIconsRequests.push(route.request().url());
        return route.continue();
      });
      await page.route('**/apm/fleet/has_apm_policies**', (route) => {
        apmPoliciesRequests.push(route.request().url());
        return route.continue();
      });

      await page.goto(serviceOverviewHref);
      await expect(page.getByRole('tab', { name: 'Overview', selected: true })).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });

      expect(hasDataRequests).toHaveLength(1);
      expect(serviceIconsRequests).toHaveLength(1);
      expect(apmPoliciesRequests).toHaveLength(1);

      await page.getByRole('tab', { name: 'Errors' }).click();
      await expect(page.getByRole('tab', { name: 'Errors', selected: true })).toBeVisible();
      await expect(page.getByTestId('errorDistribution')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });

      expect(hasDataRequests).toHaveLength(1);
      expect(serviceIconsRequests).toHaveLength(1);
      expect(apmPoliciesRequests).toHaveLength(1);
    });
  }
);
