/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { journey, step, expect, before, after, Page } from '@elastic/synthetics';
import { monitorManagementPageProvider } from '../page_objects/monitor_management';
import { DataStream } from '../../common/runtime_types/monitor_management';
import { byTestId } from './utils';

const customLocation = process.env.SYNTHETICS_TEST_LOCATION;

const basicMonitorDetails = {
  location: customLocation || 'US Central',
  schedule: '3',
};
const httpName = `http monitor ${uuid.v4()}`;
const icmpName = `icmp monitor ${uuid.v4()}`;
const tcpName = `tcp monitor ${uuid.v4()}`;
const browserName = `browser monitor ${uuid.v4()}`;

const configuration = {
  [DataStream.HTTP]: {
    monitorConfig: {
      ...basicMonitorDetails,
      name: httpName,
      url: 'https://elastic.co',
      locations: [basicMonitorDetails.location],
      apmServiceName: 'Sample APM Service',
    },
    monitorDetails: {
      ...basicMonitorDetails,
      name: httpName,
      url: 'https://elastic.co',
    },
  },
  [DataStream.TCP]: {
    monitorConfig: {
      ...basicMonitorDetails,
      name: tcpName,
      host: 'smtp.gmail.com:587',
      locations: [basicMonitorDetails.location],
      apmServiceName: 'Sample APM Service',
    },
    monitorDetails: {
      ...basicMonitorDetails,
      name: tcpName,
      host: 'smtp.gmail.com:587',
    },
  },
  [DataStream.ICMP]: {
    monitorConfig: {
      ...basicMonitorDetails,
      name: icmpName,
      host: '1.1.1.1',
      locations: [basicMonitorDetails.location],
      apmServiceName: 'Sample APM Service',
    },
    monitorDetails: {
      ...basicMonitorDetails,
      name: icmpName,
      hosts: '1.1.1.1',
    },
  },
  [DataStream.BROWSER]: {
    monitorConfig: {
      ...basicMonitorDetails,
      name: browserName,
      inlineScript: 'step("test step", () => {})',
      locations: [basicMonitorDetails.location],
      apmServiceName: 'Sample APM Service',
    },
    monitorDetails: {
      ...basicMonitorDetails,
      name: browserName,
    },
  },
};

const createMonitorJourney = ({
  monitorName,
  monitorType,
  monitorConfig,
  monitorDetails,
}: {
  monitorName: string;
  monitorType: DataStream;
  monitorConfig: Record<string, string | string[]>;
  monitorDetails: Record<string, string>;
}) => {
  journey(
    `MonitorManagement-monitor-${monitorType}`,
    async ({ page, params }: { page: Page; params: any }) => {
      const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });
      const isRemote = process.env.SYNTHETICS_REMOTE_ENABLED;
      const deleteMonitor = async () => {
        await uptime.navigateToMonitorManagement();
        const isSuccessful = await uptime.deleteMonitor();
        expect(isSuccessful).toBeTruthy();
      };

      before(async () => {
        await uptime.waitForLoadingToFinish();
      });

      after(async () => {
        await deleteMonitor();
      });

      step('Go to monitor-management', async () => {
        await uptime.navigateToMonitorManagement();
      });

      step('login to Kibana', async () => {
        await uptime.loginToKibana();
        const invalid = await page.locator(
          `text=Username or password is incorrect. Please try again.`
        );
        expect(await invalid.isVisible()).toBeFalsy();
      });

      step(`create ${monitorType} monitor`, async () => {
        await uptime.clickAddMonitor();
        await uptime.createMonitor({ monitorConfig, monitorType });
        const isSuccessful = await uptime.confirmAndSave();
        expect(isSuccessful).toBeTruthy();
      });

      step(`view ${monitorType} details in monitor management UI`, async () => {
        await uptime.navigateToMonitorManagement();
        const hasFailure = await uptime.findMonitorConfiguration(monitorDetails);
        expect(hasFailure).toBeFalsy();
      });

      if (isRemote) {
        step('view results in overview page', async () => {
          await uptime.navigateToOverviewPage();
          await page.waitForSelector(`text=${monitorName}`, { timeout: 160 * 1000 });
        });
      }
    }
  );
};

Object.keys(configuration).forEach((type) => {
  createMonitorJourney({
    monitorType: type as DataStream,
    monitorName: `${type} monitor`,
    monitorConfig: configuration[type as DataStream].monitorConfig,
    monitorDetails: configuration[type as DataStream].monitorDetails,
  });
});

journey('Monitor Management breadcrumbs', async ({ page, params }: { page: Page; params: any }) => {
  const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const defaultMonitorDetails = {
    name: `Sample monitor ${uuid.v4()}`,
    location: 'US Central',
    schedule: '3',
    apmServiceName: 'service',
  };

  before(async () => {
    await uptime.waitForLoadingToFinish();
  });

  step('Go to monitor-management', async () => {
    await uptime.navigateToMonitorManagement();
  });

  step('login to Kibana', async () => {
    await uptime.loginToKibana();
  });

  step('Check breadcrumb', async () => {
    const lastBreadcrumb = await (await uptime.findByTestSubj('"breadcrumb last"')).textContent();
    expect(lastBreadcrumb).toEqual('Monitor management');
  });

  step('check breadcrumbs', async () => {
    await uptime.clickAddMonitor();
    const breadcrumbs = await page.$$('[data-test-subj="breadcrumb"]');
    expect(await breadcrumbs[1].textContent()).toEqual('Monitor management');
    const lastBreadcrumb = await (await uptime.findByTestSubj('"breadcrumb last"')).textContent();
    expect(lastBreadcrumb).toEqual('Add monitor');
  });

  step('create monitor http monitor', async () => {
    const monitorDetails = {
      ...defaultMonitorDetails,
      url: 'https://elastic.co',
      locations: [basicMonitorDetails.location],
    };
    await uptime.createBasicHTTPMonitorDetails(monitorDetails);
    const isSuccessful = await uptime.confirmAndSave();
    expect(isSuccessful).toBeTruthy();
  });

  step('edit http monitor and check breadcrumb', async () => {
    await uptime.editMonitor();
    // breadcrumb is available before edit page is loaded, make sure its edit view
    await page.waitForSelector(byTestId('monitorManagementMonitorName'), { timeout: 60 * 1000 });
    const breadcrumbs = await page.$$('[data-test-subj=breadcrumb]');
    expect(await breadcrumbs[1].textContent()).toEqual('Monitor management');
    const lastBreadcrumb = await (await uptime.findByTestSubj('"breadcrumb last"')).textContent();
    expect(lastBreadcrumb).toEqual('Edit monitor');
  });

  step('delete monitor', async () => {
    await uptime.navigateToMonitorManagement();
    const isSuccessful = await uptime.deleteMonitor();
    expect(isSuccessful).toBeTruthy();
  });
});
