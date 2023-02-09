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

journey('Exploratory view', async ({ page, params }) => {
  recordVideo(page);

  before(async () => {
    await waitForLoadingToFinish({ page });
  });

  const expUrl = createExploratoryViewUrl({
    reportType: 'kpi-over-time',
    allSeries: [
      {
        name: 'Elastic page views',
        time: {
          from: '2021-01-18T12:20:01.682Z',
          to: '2021-01-18T12:25:27.484Z',
        },
        selectedMetricField: '___records___',
        reportDefinitions: { 'service.name': [] },
        dataType: 'ux',
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

  step('renders as expected', async () => {
    await Promise.all([page.waitForNavigation(TIMEOUT_60_SEC), page.click('text=Explore data')]);
    await page.click('text=User experience (RUM)');
    await page.click('[aria-label="Toggle series information"] >> text=Page views', TIMEOUT_60_SEC);
    await page.click('[aria-label="Edit series"]', TIMEOUT_60_SEC);
    await page.click('button:has-text("No breakdown")');
    await page.click('button[role="option"]:has-text("Operating system")', TIMEOUT_60_SEC);
    await page.click('button:has-text("Apply changes")');

    await page.click('text=Chrome OS');
    await page.click('text=iOS');
    await page.click('text=iOS');
    await page.click('text=Chrome OS');
    await page.click('text=Ubuntu');
    await page.click('text=Android');
    await page.click('text=Linux');
    await page.click('text=Mac OS X');
    await page.click('text=Windows');
    await page.click('h1:has-text("Explore data")');
  });

  step('Edit and change the series to distribution', async () => {
    await page.click('[aria-label="View series actions"]');
    await page.click('[aria-label="Remove series"]');
    await page.click('button:has-text("KPI over time")');
    await page.click('button[role="option"]:has-text("Performance distribution")');
    await page.click('button:has-text("Add series")');
    await page.click('button:has-text("Select data type")');
    await page.click('button:has-text("User experience (RUM)")');
    await page.click('button:has-text("Select report metric")');
    await page.click('button:has-text("Page load time")');
    await page.click('.euiComboBox__inputWrap');
    await page.click('[aria-label="Date quick select"]');
    await page.click('text=Last 1 year');
    await page.click('[aria-label="Date quick select"]');
    await page.click('[aria-label="Time value"]');
    await page.fill('[aria-label="Time value"]', '010');
    await page.selectOption('[aria-label="Time unit"]', 'y');

    await page.click('div[role="dialog"] button:has-text("Apply")');
    await page.click('.euiComboBox__inputWrap');
    await page.click('button[role="option"]:has-text("elastic-co-frontend")');
    await page.click('button:has-text("Apply changes")');
    await page.click('text=ux-series-1');
    await page.click('text=User experience (RUM)');
    await page.click('text=Page load time');
    await page.click('text=Pages loaded');
    await page.click('button:has-text("95th")');
    await page.click('button:has-text("90th")');
    await page.click('button:has-text("99th")');
    await page.click('[aria-label="Edit series"]');
    await page.click('button:has-text("No breakdown")');
    await page.click('button[role="option"]:has-text("Browser family")');
    await page.click('button:has-text("Apply changes")');
    await page.click('text=Edge');
    await page.click('text=Opera');
    await page.click('text=Safari');
    await page.click('text=HeadlessChrome');
    await page.click('[aria-label="Firefox; Activate to hide series in graph"]');
  });
});
