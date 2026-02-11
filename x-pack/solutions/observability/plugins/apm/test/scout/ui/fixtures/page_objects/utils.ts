/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '../constants';

export async function waitForTableToLoad(page: ScoutPage, testId: string) {
  const table = page.getByTestId(testId);

  await table.waitFor({ timeout: EXTENDED_TIMEOUT });

  await table.locator('div.euiBasicTable').waitFor();
}

export async function waitForChartToLoad(page: ScoutPage, testId: string) {
  const chart = page.getByTestId(testId);

  await chart.waitFor({ timeout: EXTENDED_TIMEOUT });
  await chart.getByTestId('loading').waitFor({ state: 'hidden', timeout: EXTENDED_TIMEOUT });
}
