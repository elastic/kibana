/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before, after, Page } from '@elastic/synthetics';
import { monitorManagementPageProvider } from '../page_objects/monitor_management';

journey(
  'Monitor Management-enablement-superuser',
  async ({ page, params }: { page: Page; params: any }) => {
    const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });

    before(async () => {
      await uptime.waitForLoadingToFinish();
    });

    after(async () => {
      await uptime.enableMonitorManagement(false);
    });

    step('Go to monitor-management', async () => {
      await uptime.navigateToMonitorManagement();
    });

    step('login to Kibana', async () => {
      await uptime.loginToKibana();
      const invalid = await page.locator(
        `text=Username or password is incorrect. Please try again.`
      );
      expect(await invalid.isVisible()).toBeFalsy();
    });

    step('check add monitor button', async () => {
      expect(await uptime.checkIsEnabled()).toBe(false);
    });

    step('enable monitor management', async () => {
      await uptime.enableMonitorManagement();
      expect(await uptime.checkIsEnabled()).toBe(true);
    });
  }
);

journey(
  'MonitorManagement-enablement-obs-admin',
  async ({ page, params }: { page: Page; params: any }) => {
    const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });

    before(async () => {
      await uptime.waitForLoadingToFinish();
    });

    step('Go to monitor-management', async () => {
      await uptime.navigateToMonitorManagement();
    });

    step('login to Kibana', async () => {
      await uptime.loginToKibana('obs_admin_user', 'changeme');
      const invalid = await page.locator(
        `text=Username or password is incorrect. Please try again.`
      );
      expect(await invalid.isVisible()).toBeFalsy();
    });

    step('check add monitor button', async () => {
      expect(await uptime.checkIsEnabled()).toBe(false);
    });

    step('check that enabled toggle does not appear', async () => {
      expect(await page.$(`[data-test-subj=syntheticsEnableSwitch]`)).toBeFalsy();
    });
  }
);
