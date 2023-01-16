/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { journey, step, expect, after, Page } from '@elastic/synthetics';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { monitorManagementPageProvider } from '../../page_objects/uptime/monitor_management';

journey(
  'Monitor Management-enablement-superuser',
  async ({ page, params }: { page: Page; params: any }) => {
    recordVideo(page);

    const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });

    after(async () => {
      await uptime.enableMonitorManagement(false);
    });

    step('Go to monitor-management', async () => {
      await uptime.navigateToMonitorManagement(true);
    });

    step('check add monitor button', async () => {
      expect(await uptime.checkIsEnabled()).toBe(false);
    });

    step('enable Monitor Management', async () => {
      await uptime.enableMonitorManagement();
      expect(await uptime.checkIsEnabled()).toBe(true);
    });
  }
);

journey(
  'MonitorManagement-enablement-obs-admin',
  async ({ page, params }: { page: Page; params: any }) => {
    recordVideo(page);

    const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });

    step('Go to monitor-management', async () => {
      await uptime.navigateToMonitorManagement(true);
    });

    step('check add monitor button', async () => {
      expect(await uptime.checkIsEnabled()).toBe(false);
    });

    step('check that enabled toggle does not appear', async () => {
      expect(await page.$(`[data-test-subj=syntheticsEnableSwitch]`)).toBeFalsy();
    });
  }
);
