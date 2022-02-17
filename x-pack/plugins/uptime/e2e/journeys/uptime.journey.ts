/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before } from '@elastic/synthetics';
import { byTestId, waitForLoadingToFinish } from './utils';

journey('uptime', ({ page, params }) => {
  before(async () => {
    await waitForLoadingToFinish({ page });
  });

  step('Go to Kibana', async () => {
    await page.goto(`${params.kibanaUrl}/app/uptime?dateRangeStart=now-5y&dateRangeEnd=now`, {
      waitUntil: 'networkidle',
    });
  });

  step('Login into kibana', async () => {
    await page.fill('[data-test-subj=loginUsername]', 'elastic', {
      timeout: 60 * 1000,
    });
    await page.fill('[data-test-subj=loginPassword]', 'changeme');

    await page.click('[data-test-subj=loginSubmit]');
  });

  step('dismiss synthetics notice', async () => {
    await page.click('[data-test-subj=uptimeDismissSyntheticsCallout]', {
      timeout: 60 * 1000,
    });
  });

  step('change uptime index pattern', async () => {
    await page.click(byTestId('settings-page-link'));

    await page.waitForTimeout(5 * 1000);

    const currentIndex = await page.inputValue(byTestId('heartbeat-indices-input-loaded'));

    if (currentIndex !== 'heartbeat-*') {
      await page.fill(byTestId('heartbeat-indices-input-loaded'), 'heartbeat-*');
      await page.click(byTestId('apply-settings-button'));
    }

    await page.goBack();
  });

  step('Check if there is table data', async () => {
    await page.click('[data-test-subj=uptimeOverviewPage]');
    await page.click('div.euiBasicTable', { timeout: 60 * 1000 });
  });

  step('Click on my monitor', async () => {
    await page.click('[data-test-subj=monitor-page-link-0001-up]');
  });
});
