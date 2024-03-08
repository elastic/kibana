/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before } from '@elastic/synthetics';
import { recordVideo } from '@kbn/observability-shared-plugin/e2e';
import { loginToKibana, waitForLoadingToFinish } from './utils';

journey('INP', async ({ page, params }) => {
  recordVideo(page);

  before(async () => {
    await waitForLoadingToFinish({ page });
  });

  const queryParams = {
    percentile: '50',
    rangeFrom: 'now-1y',
    rangeTo: 'now',
  };

  const queryString = new URLSearchParams(queryParams).toString();

  const baseUrl = `${params.kibanaUrl}/app/ux`;

  step('Go to UX Dashboard', async () => {
    await page.goto(`${baseUrl}?${queryString}`, {
      waitUntil: 'networkidle',
    });
    await loginToKibana({
      page,
      user: { username: 'viewer', password: 'changeme' },
    });
  });

  step('Check INP Values', async () => {
    expect(await page.$('text=Interaction to next paint'));
    await page.waitForSelector('[data-test-subj=inp-core-vital] > .euiTitle');
    await page.waitForSelector('text=381 ms');
  });
});
