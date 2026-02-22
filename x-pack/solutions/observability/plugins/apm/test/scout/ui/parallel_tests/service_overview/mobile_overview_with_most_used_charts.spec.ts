/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 *
 * Failing: See https://github.com/elastic/kibana/issues/207183
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

test.describe(
  'Mobile Service overview page',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.skip('shows the most used charts', async ({ page, kbnUrl }) => {
      const apmMobileServiceOverview = `${kbnUrl.app(
        'apm'
      )}/mobile-services/synth-android?rangeFrom=${testData.START_DATE}&rangeTo=${
        testData.END_DATE
      }`;
      await page.goto(apmMobileServiceOverview);
      await page.waitForResponse((res) =>
        res.url().includes('/internal/apm/mobile-services/synth-android/most_used_charts')
      );
      await expect(page.getByTestId('mostUsedChart-device')).toBeVisible();
      await expect(page.getByTestId('mostUsedChart-netConnectionType')).toBeVisible();
      await expect(page.getByTestId('mostUsedChart-osVersion')).toBeVisible();
      await expect(page.getByTestId('mostUsedChart-appVersion')).toBeVisible();
    });
  }
);
