/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before } from '@elastic/synthetics';
import { recordVideo } from '../record_video';
import { createExploratoryViewUrl } from '../../public/components/shared/exploratory_view/configurations/exploratory_view_url';
import { loginToKibana, TIMEOUT_60_SEC, waitForLoadingToFinish } from '../utils';

journey('SingleMetric', async ({ page, params }) => {
  recordVideo(page);

  before(async () => {
    await waitForLoadingToFinish({ page });
  });

  const expUrl = createExploratoryViewUrl({
    reportType: 'single-metric',
    allSeries: [
      {
        dataType: 'synthetics',
        time: {
          from: 'now-1y/d',
          to: 'now',
        },
        name: 'synthetics-series-1',
        selectedMetricField: 'monitor_availability',
        reportDefinitions: {
          'monitor.name': ['test-monitor - inline'],
          'url.full': ['https://www.elastic.co/'],
        },
      },
    ],
  });

  const baseUrl = `${params.kibanaUrl}${expUrl}`;

  step('Go to Exploratory view', async () => {
    await page.goto(baseUrl, {
      waitUntil: 'networkidle',
    });
    await loginToKibana({
      page,
      user: { username: 'elastic', password: 'changeme' },
      dismissTour: false,
    });
  });

  step('Open exploratory view with single metric', async () => {
    await Promise.all([
      page.waitForNavigation(TIMEOUT_60_SEC),
      page.click('text=Explore data', TIMEOUT_60_SEC),
    ]);

    await waitForLoadingToFinish({ page });

    await page.click('text=0.0%', TIMEOUT_60_SEC);
    await page.click('text=0.0%Availability');
    await page.click(
      'text=Explore data Last Updated: a few seconds agoRefreshHide chart0.0%AvailabilityRep'
    );
  });
});
