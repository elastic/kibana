/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before, Page } from '@elastic/synthetics';
import { makeChecksWithStatus } from '../../helpers/make_checks';
import { monitorDetailsPageProvider } from '../../page_objects/monitor_details';
import { byTestId, delay } from '../utils';

journey('MonitorPingRedirects', async ({ page, params }: { page: Page; params: any }) => {
  const monitorDetails = monitorDetailsPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const testMonitor = {
    id: '0000-intermittent',
    start: 'now-15m',
    end: 'now',
    redirects: ['http://localhost:3000/first', 'https://www.washingtonpost.com/'],
  };

  before(async () => {
    await monitorDetails.waitForLoadingToFinish();
    await makeChecksWithStatus(
      params.getService('es'),
      testMonitor.id,
      5,
      2,
      10000,
      {
        http: {
          rtt: { total: { us: 157784 } },
          response: {
            status_code: 200,
            redirects: testMonitor.redirects,
            body: {
              bytes: 642102,
              hash: '597a8cfb33ff8e09bff16283306553c3895282aaf5386e1843d466d44979e28a',
            },
          },
        },
      },
      'up'
    );
    await delay(5000);
  });

  step('go to monitor-management', async () => {
    await monitorDetails.navigateToOverviewPage({
      dateRangeEnd: testMonitor.end,
      dateRangeStart: testMonitor.start,
    });
  });

  step('login to Kibana', async () => {
    await monitorDetails.loginToKibana();
  });

  step('go to monitor details', async () => {
    await monitorDetails.navigateToMonitorDetails(testMonitor.id);
  });

  step('displays redirect info in detail panel', async () => {
    await monitorDetails.waitForLoadingToFinish();
    expect(await monitorDetails.getMonitorRedirects()).toEqual(`${testMonitor.redirects.length}`);
  });

  step('displays redirects in ping list expand row', async () => {
    await monitorDetails.expandPingDetails();
    await monitorDetails.waitForLoadingToFinish();
    await page.waitForSelector(byTestId('uptimeMonitorPingListRedirectInfo'));
  });
});
