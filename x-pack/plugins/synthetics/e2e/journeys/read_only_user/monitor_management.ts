/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { before, expect, journey, Page, step } from '@elastic/synthetics';
import { monitorManagementPageProvider } from '../../page_objects/monitor_management';
import { byTestId } from '../utils';

journey(
  'Monitor Management read only user',
  async ({ page, params }: { page: Page; params: any }) => {
    const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });

    before(async () => {
      await uptime.waitForLoadingToFinish();
    });

    step('Go to monitor-management', async () => {
      await uptime.navigateToMonitorManagement();
    });

    step('login to Kibana', async () => {
      await uptime.loginToKibana('obs_read_user', 'changeme');
    });

    step('Adding monitor is disabled', async () => {
      expect(await page.isEnabled(byTestId('syntheticsAddMonitorBtn'))).toBeFalsy();
    });
  }
);
