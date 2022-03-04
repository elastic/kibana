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
 */

import { journey, step, expect, before, Page } from '@elastic/synthetics';
import { monitorManagementPageProvider } from '../page_objects/monitor_management';

journey('MontiorDetails', async ({ page, params }: { page: Page; params: any }) => {
  const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });

  before(async () => {
    await uptime.waitForLoadingToFinish();
  });

  step('Go to monitor-management', async () => {
    await uptime.navigateToMonitorManagement();
  });

  step('login to Kibana', async () => {
    await uptime.loginToKibana();
    const invalid = await page.locator(`text=Username or password is incorrect. Please try again.`);
    expect(await invalid.isVisible()).toBeFalsy();
  });

  step('navigate to monitor details page', async () => {
    await uptime.assertText({ text: 'Test Monitor' });
    await Promise.all([page.waitForNavigation(), page.click('text="Test Monitor"')]);
    await uptime.assertText({ text: 'Test Monitor' });
    const url = await page.textContent('[data-test-subj="monitor-page-url"]');
    const type = await page.textContent('[data-test-subj="monitor-page-type"]');
    expect(url).toEqual('https://www.google.com(opens in a new tab or window)');
    expect(type).toEqual('HTTP');
  });
});
