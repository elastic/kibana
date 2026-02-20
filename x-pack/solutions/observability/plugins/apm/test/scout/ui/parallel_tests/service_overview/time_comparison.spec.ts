/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 *
 * See details: https://github.com/elastic/kibana/issues/191961
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

test.describe(
  'Service overview: Time Comparison',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test.skip('enables by default the time comparison feature with Last 24 hours selected', async ({
      page,
      kbnUrl,
    }) => {
      await page.goto(`${kbnUrl.app('apm')}/services/opbeans-java/overview`);
      await expect(page).toHaveURL(/comparisonEnabled=true/);
      await expect(page).toHaveURL(/offset=1d/);
    });

    test.skip('changes comparison type', async ({ page, kbnUrl }) => {
      await page.goto(
        `${kbnUrl.app('apm')}/services/opbeans-java/overview?rangeFrom=${testData.START_DATE}&rangeTo=${testData.END_DATE}`
      );
      await expect(page.getByText(testData.SERVICE_OPBEANS_JAVA)).toBeVisible();
      await expect(page.getByTestId('comparisonSelect')).toHaveValue('1d');
      await page.getByTestId('comparisonSelect').selectOption('1w');
      await expect(page.getByTestId('comparisonSelect')).toHaveValue('1w');
    });
  }
);
