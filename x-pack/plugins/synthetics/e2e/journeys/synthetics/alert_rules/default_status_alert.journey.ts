/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, after, expect } from '@elastic/synthetics';
import { byTestId } from '@kbn/ux-plugin/e2e/journeys/utils';
import { RetryService } from '@kbn/ftr-common-functional-services';
import uuid from 'uuid';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { getReasonMessage } from '../../../../server/legacy_uptime/lib/alerts/status_check';
import { syntheticsAppPageProvider } from '../../../page_objects/synthetics/synthetics_app';
import { SyntheticsServices } from '../services/synthetics_services';

journey(`DefaultStatusAlert`, async ({ page, params }) => {
  recordVideo(page);

  page.setDefaultTimeout(60 * 1000);
  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });

  const services = new SyntheticsServices(params);

  const getService = params.getService;
  const retry: RetryService = getService('retry');

  const firstCheckTime = new Date(Date.now()).toISOString();
  let downCheckTime = new Date(Date.now()).toISOString();

  before(async () => {
    await services.cleaUp();
    await services.enableMonitorManagedViaApi();
    await services.addTestMonitor('Test Monitor', {
      type: 'http',
      urls: 'https://www.google.com',
      custom_heartbeat_id: 'b9d9e146-746f-427f-bbf5-6e786b5b4e73',
      locations: [
        { id: 'Test private location', label: 'Test private location', isServiceManaged: true },
      ],
    });
    await services.addTestSummaryDocument({ timestamp: firstCheckTime });
  });

  after(async () => {
    await services.cleaUp();
  });

  step('Go to monitors page', async () => {
    await syntheticsApp.navigateToOverview(true);
  });

  step('should create default status alert', async () => {
    await page.click(byTestId('xpack.synthetics.alertsPopover.toggleButton'));
    await page.isDisabled(byTestId('xpack.synthetics.toggleAlertFlyout'));
    await page.click(byTestId('xpack.synthetics.toggleAlertFlyout'));
    await page.waitForSelector('text=Edit rule');
    await page.selectOption(byTestId('intervalInputUnit'), { label: 'second' });
    await page.fill(byTestId('intervalInput'), '10');
    await page.click(byTestId('saveEditedRuleButton'));
    await page.waitForSelector("text=Updated 'Synthetics internal alert'");
  });

  step('Monitor is as up in overview page', async () => {
    await retry.tryForTime(60 * 1000, async () => {
      const totalDown = await page.textContent(
        byTestId('xpack.uptime.synthetics.overview.status.up')
      );
      expect(totalDown).toBe('1Up');
    });

    await page.hover('text=Test Monitor');
    await page.click('[aria-label="Open actions menu"]');
  });

  step('Disable default alert for monitor', async () => {
    await page.click('text=Disable status alert');
    await page.waitForSelector(`text=Alerts are now disabled for the monitor "Test Monitor".`);
    await page.click('text=Enable status alert');
  });

  step('set the monitor status as down', async () => {
    downCheckTime = new Date(Date.now()).toISOString();
    await services.addTestSummaryDocument({
      docType: 'summaryDown',
      timestamp: downCheckTime,
    });
    await page.waitForTimeout(5 * 1000);

    await page.click(byTestId('syntheticsMonitorManagementTab'));
    await page.click(byTestId('syntheticsMonitorOverviewTab'));

    const totalDown = await page.textContent(
      byTestId('xpack.uptime.synthetics.overview.status.down')
    );
    expect(totalDown).toBe('1Down');
  });

  step('verified that it generates an alert', async () => {
    await page.click(byTestId('observability-nav-observability-overview-alerts'));

    const reasonMessage = getReasonMessage({
      name: 'Test Monitor',
      location: 'Test private location',
      timestamp: downCheckTime,
      status: 'is down.',
    });
    await retry.tryForTime(2 * 60 * 1000, async () => {
      await page.click(byTestId('querySubmitButton'));
      expect(
        await page.isVisible(`text=1 Alert`, {
          timeout: 10 * 1000,
        })
      ).toBe(true);

      const text = await page.textContent(`${byTestId('dataGridRowCell')} .euiLink`);

      expect(text).toBe(reasonMessage);
      expect(await page.isVisible(`text=1 Alert`)).toBe(true);
    });
  });

  step('set monitor status to up and verify that alert recovers', async () => {
    await services.addTestSummaryDocument();

    await retry.tryForTime(2 * 60 * 1000, async () => {
      await page.click(byTestId('querySubmitButton'));
      await page.isVisible(`text=Recovered`, { timeout: 5 * 1000 });
      await page.isVisible(`text=1 Alert`, { timeout: 5 * 1000 });
    });
  });

  step('set the status down again to generate another alert', async () => {
    await services.addTestSummaryDocument({ docType: 'summaryDown' });

    await retry.tryForTime(2 * 60 * 1000, async () => {
      await page.click(byTestId('querySubmitButton'));
      await page.isVisible(`text=Active`, { timeout: 5 * 1000 });
      await page.isVisible(`text=1 Alert`);
    });
  });

  step('Adds another down monitor and it auto adds the alert', async () => {
    const monitorId = uuid.v4();
    const name = `Test Monitor 2`;
    await services.addTestMonitor(name, {
      type: 'http',
      urls: 'https://www.google.com',
      custom_heartbeat_id: monitorId,
      locations: [
        { id: 'Test private location', label: 'Test private location', isServiceManaged: true },
      ],
    });

    downCheckTime = new Date(Date.now()).toISOString();

    await services.addTestSummaryDocument({
      timestamp: downCheckTime,
      monitorId,
      docType: 'summaryDown',
      name,
    });

    const reasonMessage = getReasonMessage({
      name,
      location: 'Test private location',
      timestamp: downCheckTime,
      status: 'is down.',
    });

    await retry.tryForTime(2 * 60 * 1000, async () => {
      await page.click(byTestId('querySubmitButton'));
      await page.isVisible(`text=2 Alerts`, { timeout: 5 * 1000 });
      const alertReasonElem = await page.waitForSelector(`text=${reasonMessage}`, {
        timeout: 5 * 1000,
      });

      expect(await alertReasonElem?.innerText()).toBe(reasonMessage);
    });
  });

  step('Deleting the monitor recovers the alert', async () => {
    await services.deleteTestMonitorByQuery('"Test Monitor 2"');
    await page.click(byTestId('alert-status-filter-recovered-button'));
    await retry.tryForTime(3 * 60 * 1000, async () => {
      await page.click(byTestId('querySubmitButton'));
      expect(await page.isVisible(`text=1 Alert`)).toBe(true);
    });

    await page.click('[aria-label="View in app"]');
    await page.click(byTestId('syntheticsMonitorOverviewTab'));
    await page.waitForSelector('text=Monitor details');
  });
});
