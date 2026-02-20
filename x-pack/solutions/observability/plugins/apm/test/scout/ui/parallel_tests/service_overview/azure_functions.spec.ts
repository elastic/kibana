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
  'Service overview - azure functions',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('displays a cold start rate chart and not a transaction breakdown chart', async ({
      page,
      kbnUrl,
    }) => {
      const serviceOverviewHref = `${kbnUrl.app('apm')}/services/synth-dotnet/overview?rangeFrom=${
        testData.START_DATE
      }&rangeTo=${testData.END_DATE}`;
      await page.goto(serviceOverviewHref);
      await page.waitForResponse((res) =>
        res.url().includes('/internal/apm/services/synth-dotnet/transactions/charts/coldstart_rate')
      );
      await expect(page.getByText('Cold start rate')).toBeVisible();
      await expect(page.getByText('Time spent by span type')).not.toBeVisible();
    });
  }
);
