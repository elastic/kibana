/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { after, before, expect, journey, step } from '@elastic/synthetics';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { cleanTestMonitors, enableMonitorManagedViaApi } from './services/add_monitor';
import { getMonitor } from './services/get_monitor';
import { addTestMonitorProject } from './services/add_monitor_project';
import { syntheticsAppPageProvider } from '../../page_objects/synthetics/synthetics_app';

journey('Project Monitor Read-only', async ({ page, params }) => {
  recordVideo(page);

  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });
  let originalMonitorConfiguration: Record<string, unknown> | undefined;

  let monitorId: string;
  const monitorName = 'test-project-monitor';

  before(async () => {
    await enableMonitorManagedViaApi(params.kibanaUrl);
    await cleanTestMonitors(params);

    await addTestMonitorProject(params.kibanaUrl, monitorName);

    await syntheticsApp.waitForLoadingToFinish();
  });

  step('Go to monitor-management', async () => {
    await syntheticsApp.navigateToMonitorManagement();
  });

  step('login to Kibana', async () => {
    await syntheticsApp.loginToKibana();
    const invalid = await page.locator(`text=Username or password is incorrect. Please try again.`);
    expect(await invalid.isVisible()).toBeFalsy();
  });

  step('Confirm monitor is added', async () => {
    await page.waitForSelector(`text=${monitorName}`);
  });

  step('Navigate to edit monitor', async () => {
    await syntheticsApp.navigateToEditMonitor(monitorName);
  });

  step('Confirm configuration is read-only', async () => {
    await page.waitForSelector('text=read-only');
    monitorId = new URL(await page.url()).pathname.split('/').at(-1) || '';
    originalMonitorConfiguration = await getMonitor(params.kibanaUrl, monitorId);
  });

  step('Monitor configuration is unchanged when saved', async () => {
    await syntheticsApp.confirmAndSave(true);
    const newConfiguration = await getMonitor(params.kibanaUrl, monitorId);

    // hash is always reset to empty string when monitor is edited
    // this ensures that when the monitor is pushed again, the monitor
    // config in the process takes precedence
    expect(newConfiguration).toEqual({ ...originalMonitorConfiguration, hash: '', revision: 2 });
  });

  step('Navigate to edit monitor', async () => {
    await syntheticsApp.navigateToEditMonitor(monitorName);
  });

  step('monitor can be enabled or disabled', async () => {
    await page.click('[data-test-subj="syntheticsEnableSwitch"]');

    await syntheticsApp.confirmAndSave(true);
    const newConfiguration = await getMonitor(params.kibanaUrl, monitorId);

    // hash is always reset to empty string when monitor is edited
    // this ensures that when the monitor is pushed again, the monitor
    // config in the process takes precedence
    expect(newConfiguration).toEqual({
      ...originalMonitorConfiguration,
      hash: '',
      revision: 3,
      enabled: !originalMonitorConfiguration?.enabled,
    });
  });

  step('Monitor can be repushed and overwrite any changes', async () => {
    await addTestMonitorProject(params.kibanaUrl, monitorName);
    const repushedConfiguration = await getMonitor(params.kibanaUrl, monitorId);
    expect(repushedConfiguration).toEqual({
      ...originalMonitorConfiguration,
      revision: 4,
    });
  });

  step('Navigate to edit monitor', async () => {
    await syntheticsApp.navigateToEditMonitor(monitorName);
  });

  step('Monitor can be deleted', async () => {
    await page.click('text="Delete monitor"');
    await page.click('[data-test-subj="confirmModalConfirmButton"]');
    await page.waitForSelector(`text='Deleted "${monitorName}"'`);
  });

  after(async () => {
    await cleanTestMonitors(params);
  });
});
