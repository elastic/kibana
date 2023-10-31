/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, after, expect } from '@elastic/synthetics';
import { RetryService } from '@kbn/ftr-common-functional-services';
import { recordVideo } from '../../helpers/record_video';
import { byTestId } from '../../helpers/utils';
import { syntheticsAppPageProvider } from '../page_objects/synthetics_app';
import { SyntheticsServices } from './services/synthetics_services';

journey(`TestNowMode`, async ({ page, params }) => {
  page.setDefaultTimeout(60 * 1000);
  recordVideo(page);
  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });

  const services = new SyntheticsServices(params);

  const getService = params.getService;
  const retry: RetryService = getService('retry');

  const firstCheckTime = new Date(Date.now()).toISOString();

  let testRunId: string | undefined;

  before(async () => {
    page.on('request', (evt) => {
      if (
        evt.resourceType() === 'fetch' &&
        (evt.url().includes('service/monitors/trigger/') ||
          evt.url().includes('synthetics/service/monitors/run_once'))
      ) {
        evt
          .response()
          ?.then((res) => res?.json())
          .then((res) => {
            if (res.testRunId) {
              testRunId = res.testRunId;
            } else {
              try {
                testRunId = evt.url().split('/run_once/').pop();
              } catch (e) {
                // eee
              }
            }
          });
      }
    });

    await services.cleaUp();
    await services.enableMonitorManagedViaApi();
    await services.addTestMonitor('Test Monitor', {
      type: 'http',
      urls: 'https://www.google.com',
      custom_heartbeat_id: 'b9d9e146-746f-427f-bbf5-6e786b5b4e73',
      locations: [{ id: 'us_central_qa', label: 'US Central QA', isServiceManaged: true }],
    });
    await services.addTestSummaryDocument({ timestamp: firstCheckTime });
  });

  after(async () => {
    await services.cleaUp();
  });

  step('Go to monitors page', async () => {
    await syntheticsApp.navigateToOverview(true);
  });

  step('Opens flyout when run manually', async () => {
    await page.hover('text=Test Monitor');
    await page.click('[aria-label="Open actions menu"]');
    await page.click('text=Run test manually');
    await page.waitForSelector('text=Test results');
  });

  step('Displays results when successful', async () => {
    await retry.tryForTime(30 * 1000, async () => {
      expect(testRunId?.length).toBe(36);
    });
    await services.addTestSummaryDocument({ testRunId });
    await page.waitForSelector('text=Completed');
    await page.waitForSelector('text=Took 155 ms');
    await page.waitForSelector('text=US Central QA');
  });

  step('Displays data in expanded row', async () => {
    await page.click(byTestId('uptimePingListExpandBtn'));
    await page.waitForSelector('text=Body size is 13KB.');
    await page.click('text=Response headers');
    await page.waitForSelector('text=Accept-Ranges');
    await page.waitForSelector('text=Cache-Control');
    await page.waitForSelector('text=private, max-age=0');
    await page.click(byTestId('euiFlyoutCloseButton'));
  });

  step('Add a browser monitor', async () => {
    await services.addTestMonitor('Browser Monitor', {
      type: 'browser',
      'source.inline.script':
        "step('Go to https://www.google.com', async () => {\n  await page.goto('https://www.google.com');\n});\n\nstep('Go to https://www.google.com', async () => {\n  await page.goto('https://www.google.com');\n});",
      urls: 'https://www.google.com',
      locations: [{ id: 'us_central_qa', label: 'US Central QA', isServiceManaged: true }],
    });

    await page.click(byTestId('syntheticsMonitorManagementTab'));
    await page.click(byTestId('syntheticsMonitorOverviewTab'));

    await page.hover('text=Browser Monitor');
    await page.click('[aria-label="Open actions menu"]');
    await page.click('text=Edit monitor');
  });

  step('Opens flyout when in edit mode', async () => {
    testRunId = '';
    await page.click(byTestId('syntheticsRunTestBtn'));
    await page.waitForSelector('text=Test results');
    await page.waitForSelector('text=0 steps completed');
    await page.waitForSelector('text=PENDING');
  });

  step('Displays results when successful in edit mode', async () => {
    await retry.tryForTime(30 * 1000, async () => {
      expect(testRunId?.length).toBe(36);
    });
    await page.waitForTimeout(1000);
    await services.addTestSummaryDocument({ testRunId, docType: 'journeyStart' });
    await page.waitForTimeout(1000);
    await page.waitForSelector('text=US Central QA');
    await page.waitForSelector('text=IN PROGRESS');
  });

  step('Verifies that first step is populated', async () => {
    await services.addTestSummaryDocument({ testRunId, docType: 'stepEnd', stepIndex: 1 });

    await page.waitForSelector('text=1 step completed');
    await page.waitForSelector(
      '.euiTableRowCell--hideForMobile :has-text("Go to https://www.google.com")'
    );
    expect(await page.getByTestId('stepDurationText1').first()).toHaveText('1.4 sec');
    await page.waitForSelector('text=Complete');
  });

  step('Verifies that second step is populated', async () => {
    await services.addTestSummaryDocument({ testRunId, docType: 'stepEnd', stepIndex: 2 });
    await retry.tryForTime(90 * 1000, async () => {
      await page.waitForSelector('text=2 steps completed');
      await page.waitForSelector('text="Go to step 2"');
      await page.waitForSelector('div:has-text("788 ms")');
      await page.waitForSelector('text=IN PROGRESS');
    });
  });

  step('Complete it with summary document', async () => {
    await services.addTestSummaryDocument({ testRunId, docType: 'journeyEnd' });

    await page.waitForSelector('text=COMPLETED');
    await page.waitForSelector('text=took 2 s');
  });
});
