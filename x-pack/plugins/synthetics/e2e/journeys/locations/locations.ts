/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, Page } from '@elastic/synthetics';
import { makeChecksWithStatus } from '../../helpers/make_checks';
import { monitorDetailsPageProvider } from '../../page_objects/monitor_details';

journey('Observer location', async ({ page, params }: { page: Page; params: any }) => {
  const monitorDetails = monitorDetailsPageProvider({ page, kibanaUrl: params.kibanaUrl });

  const NO_LOCATION_MONITOR_ID = 'location-testing-id';

  const LESS_AVAIL_MONITOR_ID = 'less-availability-monitor';

  const addMonitorWithNoLocation = async () => {
    /**
     * This mogrify function will strip the documents of their location
     * data (but preserve their location name), which is necessary for
     * this test to work as desired.
     * @param d current document
     */
    const mogrifyNoLocation = (d: any) => {
      if (d.observer?.geo?.location) {
        d.observer.geo.location = undefined;
      }
      return d;
    };
    await makeChecksWithStatus(
      params.getService('es'),
      NO_LOCATION_MONITOR_ID,
      5,
      2,
      10000,
      {},
      'up',
      mogrifyNoLocation
    );
  };

  const addLessAvailMonitor = async () => {
    await makeChecksWithStatus(
      params.getService('es'),
      LESS_AVAIL_MONITOR_ID,
      5,
      2,
      10000,
      {},
      'up'
    );
    await makeChecksWithStatus(
      params.getService('es'),
      LESS_AVAIL_MONITOR_ID,
      5,
      2,
      10000,
      {},
      'down'
    );
  };

  before(async () => {
    await addMonitorWithNoLocation();
    await addLessAvailMonitor();
  });

  step('navigate to overview', async () => {
    await monitorDetails.navigateToOverviewPage();
  });

  step('login to Kibana', async () => {
    await monitorDetails.loginToKibana();
  });

  step('navigate to monitor details for no locaiton monitor', async () => {
    await monitorDetails.navigateToMonitorDetails(NO_LOCATION_MONITOR_ID);
  });

  step('displays the overall availability', async () => {
    await monitorDetails.waitForLoadingToFinish();
    const availability = '100.00 %';
    await monitorDetails.assertText({ text: availability });
  });

  step('displays less monitor availability', async () => {
    await monitorDetails.navigateToOverviewPage();
    await monitorDetails.navigateToMonitorDetails(LESS_AVAIL_MONITOR_ID);
    await monitorDetails.assertText({ text: '50.00 %' });
  });
});
