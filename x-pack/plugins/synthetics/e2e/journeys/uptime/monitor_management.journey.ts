/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { journey, step, expect, after, Page } from '@elastic/synthetics';
import { byTestId } from '@kbn/observability-plugin/e2e/utils';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { monitorManagementPageProvider } from '../../page_objects/uptime/monitor_management';
import { DataStream } from '../../../common/runtime_types/monitor_management';

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
      schedule: '10',
      name: browserName,
      inlineScript: 'step("test step", () => {})',
      locations: [basicMonitorDetails.location],
      apmServiceName: 'Sample APM Service',
    },
    monitorDetails: {
      ...basicMonitorDetails,
      schedule: '10',
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
      recordVideo(page);

      const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });
      const isRemote = process.env.SYNTHETICS_REMOTE_ENABLED;

      after(async () => {
        await uptime.navigateToMonitorManagement();
        await uptime.enableMonitorManagement(false);
      });

      step('Go to monitor-management', async () => {
        await uptime.navigateToMonitorManagement(true);
      });

      step(`create ${monitorType} monitor`, async () => {
        await uptime.enableMonitorManagement();
        await uptime.clickAddMonitor();
        await uptime.createMonitor({ monitorConfig, monitorType });
        const isSuccessful = await uptime.confirmAndSave();
        expect(isSuccessful).toBeTruthy();
      });

      step(`view ${monitorType} details in Monitor Management UI`, async () => {
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

      step('delete monitor', async () => {
        await uptime.navigateToMonitorManagement();
        const isSuccessful = await uptime.deleteMonitors();
        expect(isSuccessful).toBeTruthy();
      });
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
  recordVideo(page);
  const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });
  const defaultMonitorDetails = {
    name: `Sample monitor ${uuid.v4()}`,
    location: 'US Central',
    schedule: '3',
    apmServiceName: 'service',
  };

  after(async () => {
    await uptime.enableMonitorManagement(false);
  });

  step('Go to monitor-management', async () => {
    await uptime.navigateToMonitorManagement(true);
  });

  step('Check breadcrumb', async () => {
    const lastBreadcrumb = await (await uptime.findByTestSubj('"breadcrumb last"')).textContent();
    expect(lastBreadcrumb).toEqual('Monitor Management');
  });

  step('check breadcrumbs', async () => {
    await uptime.enableMonitorManagement();
    await uptime.clickAddMonitor();
    const breadcrumbs = await page.$$('[data-test-subj="breadcrumb"]');
    expect(await breadcrumbs[1].textContent()).toEqual('Monitor Management');
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
    expect(await breadcrumbs[1].textContent()).toEqual('Monitor Management');
    const lastBreadcrumb = await (await uptime.findByTestSubj('"breadcrumb last"')).textContent();
    expect(lastBreadcrumb).toEqual('Edit monitor');
  });

  step('delete monitor', async () => {
    await uptime.navigateToMonitorManagement();
    const isSuccessful = await uptime.deleteMonitors();
    expect(isSuccessful).toBeTruthy();
  });
});

journey(
  'MonitorManagement-case-insensitive sort',
  async ({ page, params }: { page: Page; params: any }) => {
    recordVideo(page);
    const uptime = monitorManagementPageProvider({ page, kibanaUrl: params.kibanaUrl });

    const sortedMonitors = [
      Object.assign({}, configuration[DataStream.ICMP].monitorConfig, {
        name: `A ${uuid.v4()}`,
      }),
      Object.assign({}, configuration[DataStream.ICMP].monitorConfig, {
        name: `B ${uuid.v4()}`,
      }),
      Object.assign({}, configuration[DataStream.ICMP].monitorConfig, {
        name: `aa ${uuid.v4()}`,
      }),
    ];

    after(async () => {
      await uptime.navigateToMonitorManagement();
      await uptime.deleteMonitors();
      await uptime.enableMonitorManagement(false);
    });

    step('Go to monitor-management', async () => {
      await uptime.navigateToMonitorManagement(true);
    });

    for (const monitorConfig of sortedMonitors) {
      step(`create monitor ${monitorConfig.name}`, async () => {
        await uptime.enableMonitorManagement();
        await uptime.clickAddMonitor();
        await uptime.createMonitor({ monitorConfig, monitorType: DataStream.ICMP });
        const isSuccessful = await uptime.confirmAndSave();
        expect(isSuccessful).toBeTruthy();
      });
    }

    step(`list monitors in Monitor Management UI`, async () => {
      await uptime.navigateToMonitorManagement();
      await Promise.all(
        sortedMonitors.map((monitor) =>
          page.waitForSelector(`text=${monitor.name}`, { timeout: 160 * 1000 })
        )
      );

      // Get first cell value from monitor table -> monitor name
      const rows = page.locator('tbody tr td:first-child div.euiTableCellContent');
      expect(await rows.count()).toEqual(sortedMonitors.length);

      const expectedSort = sortedMonitors
        .map((mn) => mn.name)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      expect(await rows.allTextContents()).toEqual(expectedSort);
    });
  }
);
