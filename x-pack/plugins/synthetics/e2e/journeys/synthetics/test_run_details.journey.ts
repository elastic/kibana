/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, after } from '@elastic/synthetics';
import { byTestId } from '@kbn/ux-plugin/e2e/journeys/utils';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { syntheticsAppPageProvider } from '../../page_objects/synthetics/synthetics_app';
import { SyntheticsServices } from './services/synthetics_services';

journey(`TestRunDetailsPage`, async ({ page, params }) => {
  recordVideo(page);

  page.setDefaultTimeout(60 * 1000);
  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });

  const services = new SyntheticsServices(params);

  before(async () => {
    await services.cleaUp();
    await services.enableMonitorManagedViaApi();
    await services.addTestMonitor(
      'https://www.google.com',
      {
        type: 'browser',
        urls: 'https://www.google.com',
        custom_heartbeat_id: 'a47bfc4e-361a-4eb0-83f3-b5bb68781b5b',
        locations: [
          { id: 'us_central', label: 'North America - US Central', isServiceManaged: true },
        ],
      },
      'a47bfc4e-361a-4eb0-83f3-b5bb68781b5b'
    );
  });

  after(async () => {
    await services.cleaUp();
  });

  step('Go to monitor summary page', async () => {
    await syntheticsApp.navigateToOverview(true);
  });

  step('Monitor is as up in summary page', async () => {
    await page.hover('text=https://www.google.com');
    await page.click('[aria-label="Open actions menu"]');
    await page.click('text=Go to monitor');
    await page.waitForSelector(byTestId('monitorLatestStatusUp'));
    await page.click(byTestId('syntheticsMonitorHistoryTab'));
  });

  step('Go to test run page', async () => {
    await page.click(byTestId('superDatePickerToggleQuickMenuButton'));
    await page.click('text=Last 1 year');
    await page.click(byTestId('row-ab240846-8d22-11ed-8fac-52bb19a2321e'));

    await page.waitForSelector('text=Test run details');
    await page.waitForSelector('text=Go to https://www.google.com');
    await page.waitForSelector('text=After 2.1 s');
  });
});
