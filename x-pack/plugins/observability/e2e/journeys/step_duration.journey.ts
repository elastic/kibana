/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, after } from '@elastic/synthetics';
import moment from 'moment';
import { recordVideo } from '../record_video';
import { createExploratoryViewUrl } from '../../public/components/shared/exploratory_view/configurations/exploratory_view_url';
import { loginToKibana, TIMEOUT_60_SEC, waitForLoadingToFinish } from '../utils';

journey('Exploratory view', async ({ page, params }) => {
  recordVideo(page);

  before(async () => {
    await waitForLoadingToFinish({ page });
  });

  after(async () => {
    // eslint-disable-next-line no-console
    console.log(await page.video()?.path());
  });

  const expUrl = createExploratoryViewUrl({
    reportType: 'kpi-over-time',
    allSeries: [
      {
        dataType: 'synthetics',
        time: {
          from: moment().subtract(10, 'y').toISOString(),
          to: moment().toISOString(),
        },
        name: 'synthetics-series-1',
        breakdown: 'monitor.type',
        selectedMetricField: 'monitor.duration.us',
        reportDefinitions: {
          'url.full': ['ALL_VALUES'],
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

  step('Open exploratory view with monitor duration', async () => {
    await Promise.all([
      page.waitForNavigation(TIMEOUT_60_SEC),
      page.click('text=Explore data', TIMEOUT_60_SEC),
    ]);

    await waitForLoadingToFinish({ page });
    await page.click('text=browser', TIMEOUT_60_SEC);
    await page.click('text=http');
    await page.click('[aria-label="Remove report metric"]');
    await page.click('button:has-text("Select report metric")');
    await page.click('button:has-text("Step duration")');
    await page.click('text=Select an option: Monitor type, is selectedMonitor type >> button');
    await page.click('button[role="option"]:has-text("Step name")');
    await page.click('.euiComboBox__inputWrap');
    await page.click(
      'text=Search Monitor nameCombo box. Selected. Combo box input. Search Monitor name. Ty'
    );
    await page.click('button[role="option"]:has-text("test-monitor - inline")');
    await page.click('button:has-text("Apply changes")');

    await waitForLoadingToFinish({ page });

    await page.click('[aria-label="series color: #54b399"]');
    await page.click('[aria-label="series color: #6092c0"]');
    await page.click('[aria-label="series color: #d36086"] path');
    await page.click('[aria-label="series color: #9170b8"]');
    await page.click('[aria-label="series color: #ca8eae"]');
    await page.click('[aria-label="series color: #d6bf57"]');
    await page.click('text=load homepage');
    await page.click('text=load homepage');
    await page.click('text=load github');
    await page.click('text=load github');
    await page.click('text=load google');
    await page.click('text=load google');
    await page.click('text=hover over products menu');
    await page.click('text=hover over products menu');
    await page.click('text=load homepage 1');
    await page.click('text=load homepage 1');
    await page.click('text=load homepage 2');
    await page.click('text=load homepage 2');
  });
});
