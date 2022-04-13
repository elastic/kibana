/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, Page } from '@elastic/synthetics';
import { monitorDetailsPageProvider } from '../../page_objects/monitor_details';
import { byTestId } from '../utils';

const dateRangeStart = '2019-09-10T12:40:08.078Z';
const dateRangeEnd = '2019-09-11T19:40:08.078Z';
const monitorId = '0000-intermittent';

journey('MonitorDetails', async ({ page, params }: { page: Page; params: any }) => {
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

  step('should select the ping list location filter', async () => {
    await monitorDetails.selectFilterItem('Location', 'mpls');
  });

  step('should set the status filter', async () => {
    await monitorDetails.setStatusFilterUp();
  });

  step('displays ping data as expected', async () => {
    await Promise.all(
      [
        'XZtoHm0B0I9WX_CznN-6',
        '7ZtoHm0B0I9WX_CzJ96M',
        'pptnHm0B0I9WX_Czst5X',
        'I5tnHm0B0I9WX_CzPd46',
        'y5tmHm0B0I9WX_Czx93x',
        'XZtmHm0B0I9WX_CzUt3H',
        '-JtlHm0B0I9WX_Cz3dyX',
        'k5tlHm0B0I9WX_CzaNxm',
        'NZtkHm0B0I9WX_Cz89w9',
        'zJtkHm0B0I9WX_CzftsN',
      ].map((id) => page.waitForSelector(byTestId(`"xpack.uptime.pingList.ping-${id}"`)))
    );
  });
});
