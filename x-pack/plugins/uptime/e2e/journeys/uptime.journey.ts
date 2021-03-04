/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step } from '@elastic/synthetics';

export const byTestId = (testId: string) => {
  return `[data-test-subj=${testId}]`;
};

journey('uptime', async ({ page }) => {
  async function refreshUptimeApp() {
    while (!(await page.$('div.euiBasicTable'))) {
      await page.click('[data-test-subj=superDatePickerApplyTimeButton]');
      await page.waitForTimeout(5 * 1000);
    }
  }

  async function waitForLoadingToFinish() {
    let isLoadingVisible = true;

    while (isLoadingVisible) {
      const loading = await page.$(byTestId('kbnLoadingMessage'));
      isLoadingVisible = loading !== null;
      await page.waitForTimeout(5 * 1000);
    }
  }

  step('Go to  Kibana', async () => {
    await page.goto('http://localhost:5620/app/uptime?dateRangeStart=now-2y&dateRangeEnd=now', {
      waitUntil: 'networkidle',
    });
    await page.waitForSelector(byTestId('kbnLoadingMessage'), {
      timeout: 60 * 2000,
    });
  });

  step('Login into kibana', async () => {
    await waitForLoadingToFinish();
    await page.fill('[data-test-subj=loginUsername]', 'elastic', {
      timeout: 60 * 1000,
    });
    await page.fill('[data-test-subj=loginPassword]', 'changeme');

    await page.click('[data-test-subj=loginSubmit]');
    await page.waitForTimeout(60 * 1000);
  });

  step('dismiss synthetics notice', async () => {
    await waitForLoadingToFinish();
    await page.click('[data-test-subj=uptimeDismissSyntheticsCallout]', {
      timeout: 60 * 1000,
    });
  });

  step('change uptime index pattern', async () => {
    await page.click(byTestId('settings-page-link'));

    await page.waitForTimeout(5 * 1000);

    const currentIndex = await page.$eval(
      byTestId('heartbeat-indices-input-loaded'),
      (el) => el.value
    );

    if (currentIndex !== 'heartbeat-*') {
      await page.fill(byTestId('heartbeat-indices-input-loaded'), 'heartbeat-*');
      await page.click(byTestId('apply-settings-button'));
    }

    await page.goBack();
  });

  step('Check if there is table data', async () => {
    await page.click('[data-test-subj=uptimeOverviewPage]');
    await refreshUptimeApp();
    await page.click('div.euiBasicTable', { timeout: 60 * 1000 });
  });

  step('Click on my monitor', async () => {
    await page.click('[data-test-subj=monitor-page-link-always-down]');
  });

  step('It navigates to details page', async () => {
    await page.click('[data-test-subj=uptimeMonitorPage]');
  });
});
