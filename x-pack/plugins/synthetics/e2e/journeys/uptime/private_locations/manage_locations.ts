/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { journey, step, expect } from '@elastic/synthetics';
import { byTestId, TIMEOUT_60_SEC } from '@kbn/observability-plugin/e2e/utils';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { monitorManagementPageProvider } from '../../../page_objects/uptime/monitor_management';

journey('ManagePrivateLocation', async ({ page, params: { kibanaUrl } }) => {
  recordVideo(page);

  const uptime = monitorManagementPageProvider({ page, kibanaUrl });

  step('Go to monitor-management', async () => {
    await uptime.navigateToMonitorManagement();
  });

  step('login to Kibana', async () => {
    await uptime.loginToKibana();
    const invalid = await page.locator(`text=Username or password is incorrect. Please try again.`);
    expect(await invalid.isVisible()).toBeFalsy();
  });

  step('enable management', async () => {
    await uptime.enableMonitorManagement();
  });

  step('Open manage location', async () => {
    await page.click('button:has-text("Private locations")');
  });

  step('Add two agent policies', async () => {
    await page.click('text=Create agent policy');

    await addAgentPolicy('Fleet test policy');
    await page.click('text=Create agent policy');

    await addAgentPolicy('Fleet test policy 2');
    await page.goBack({ waitUntil: 'networkidle' });
    await page.goBack({ waitUntil: 'networkidle' });
    await page.goBack({ waitUntil: 'networkidle' });
  });

  step('Add new private location', async () => {
    await page.waitForTimeout(30 * 1000);
    await page.click('button:has-text("Close")');

    await page.click('button:has-text("Private locations")');
    await page.click(byTestId('addPrivateLocationButton'));

    await addPrivateLocation('Test private location', 'Fleet test policy');
  });

  step('Add another location', async () => {
    await page.click(byTestId('addPrivateLocationButton'), TIMEOUT_60_SEC);

    await page.click('[aria-label="Select agent policy"]');
    await page.isDisabled(`button[role="option"]:has-text("Fleet test policyAgents: 0")`);

    await addPrivateLocation('Test private location 2', 'Fleet test policy 2');
  });

  const addPrivateLocation = async (name: string, policy: string) => {
    await page.click('[aria-label="Location name"]');
    await page.fill('[aria-label="Location name"]', name);
    await page.click('[aria-label="Select agent policy"]');
    await page.click(`button[role="option"]:has-text("${policy}Agents: 0")`);
    await page.click('button:has-text("Save")');
  };

  const addAgentPolicy = async (name: string) => {
    await page.click('[placeholder="Choose a name"]');
    await page.fill('[placeholder="Choose a name"]', name);
    await page.click('text=Collect system logs and metrics');
    await page.click('div[role="dialog"] button:has-text("Create agent policy")');
  };
});
