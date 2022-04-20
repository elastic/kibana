/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before, Page } from '@elastic/synthetics';
import { noop } from 'lodash';
import { monitorDetailsPageProvider } from '../../page_objects/monitor_details';
import { byTestId, delay } from '../utils';

const dateRangeStart = '2019-09-10T12:40:08.078Z';
const dateRangeEnd = '2019-09-11T19:40:08.078Z';
const monitorId = '0000-intermittent';

const alertId = 'uptime-anomaly-alert';
const alertThreshold = 'major';

journey('MonitorAlerts', async ({ page, params }: { page: Page; params: any }) => {
  const monitorDetails = monitorDetailsPageProvider({ page, kibanaUrl: params.kibanaUrl });

  before(async () => {
    await monitorDetails.waitForLoadingToFinish();
  });

  step('go to overview', async () => {
    await monitorDetails.navigateToOverviewPage({ dateRangeEnd, dateRangeStart });
  });

  step('login to Kibana', async () => {
    await monitorDetails.loginToKibana();
  });

  step('go to monitor details', async () => {
    await monitorDetails.navigateToMonitorDetails(monitorId);
    await monitorDetails.waitForLoadingToFinish();
  });

  step('clean previous data if available', async () => {
    // Should only happen locally
    await monitorDetails.disableAnomalyDetectionAlert().catch(noop);
    await monitorDetails.disableAnomalyDetection().catch(noop);
  });

  step('open anomaly detection flyout', async () => {
    await monitorDetails.waitAndRefresh(5000);
    await monitorDetails.enableAnomalyDetection();
    await monitorDetails.ensureAnomalyDetectionFlyoutIsOpen();
  });

  step('can create job', async () => {
    const canCreateJob = await monitorDetails.canCreateJob();
    const missingLicense = await page
      .waitForSelector('uptimeMLLicenseInfo', { timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    expect(canCreateJob).toBeTruthy();
    expect(missingLicense).toBeFalsy();
  });

  step('creates ML job', async () => {
    await page.click(byTestId('uptimeMLCreateJobBtn'));
    await page.waitForSelector(byTestId('uptimeMLJobSuccessfullyCreated'), { timeout: 30000 });
    await page.click(byTestId('toastCloseButton'));
  });

  step('close anomaly detection flyout', async () => {
    await page.click(byTestId('cancelSaveRuleButton'));
  });

  step('open anomaly detection alert', async () => {
    await monitorDetails.waitAndRefresh(3000);
    await monitorDetails.openAnomalyDetectionMenu();
    await page.click(byTestId('uptimeEnableAnomalyAlertBtn'));
  });

  step('update anomaly detection alert', async () => {
    await monitorDetails.updateAlert({ id: alertId, threshold: alertThreshold });
  });

  step('save anomaly detection alert', async () => {
    await page.click(byTestId('saveRuleButton'));
    await page.click(byTestId('confirmModalConfirmButton'));
    await page.waitForSelector(`text=Created rule "${alertId}"`);
  });

  step('disable anomaly detection alert', async () => {
    await monitorDetails.waitAndRefresh(5000);
    await monitorDetails.disableAnomalyDetectionAlert();
    await delay(1000); // Menu has delay when closing
    await monitorDetails.disableAnomalyDetection();
  });
});
