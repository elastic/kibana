/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, journey, Page, step } from '@elastic/synthetics';
import { byTestId } from '@kbn/observability-plugin/e2e/utils';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { monitorManagementPageProvider } from '../../../page_objects/uptime/monitor_management';

journey(
  'Monitor Management read only user',
  async ({ page, params }: { page: Page; params: any }) => {
    recordVideo(page);

    const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });

    step('Go to monitor-management', async () => {
      await uptime.navigateToMonitorManagement(false);
    });

    step('login to Kibana', async () => {
      await uptime.loginToKibana('viewer', 'changeme');
    });

    step('Adding monitor is disabled', async () => {
      expect(await page.isEnabled(byTestId('syntheticsAddMonitorBtn'))).toBeFalsy();
    });
  }
);
