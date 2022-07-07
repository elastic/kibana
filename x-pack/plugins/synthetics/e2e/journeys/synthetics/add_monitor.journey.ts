/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuid from 'uuid';
import { journey, step, expect, Page } from '@elastic/synthetics';
import { FormMonitorType } from '../../../common/runtime_types/monitor_management';
import { syntheticsAppPageProvider } from '../../page_objects/synthetics_app';

const customLocation = process.env.SYNTHETICS_TEST_LOCATION;

const basicMonitorDetails = {
  location: customLocation || 'US Central',
  schedule: '3',
};
const httpName = `http monitor ${uuid.v4()}`;
const icmpName = `icmp monitor ${uuid.v4()}`;
const tcpName = `tcp monitor ${uuid.v4()}`;
const browserName = `browser monitor ${uuid.v4()}`;
const browserRecorderName = `browser monitor recorder ${uuid.v4()}`;
const apmServiceName = 'apmServiceName';

const configuration = {
  [FormMonitorType.HTTP]: {
    monitorType: FormMonitorType.HTTP,
    monitorConfig: {
      ...basicMonitorDetails,
      name: httpName,
      url: 'https://elastic.co',
      locations: [basicMonitorDetails.location],
      apmServiceName,
    },
    monitorListDetails: {
      ...basicMonitorDetails,
      name: httpName,
    },
    monitorEditDetails: [
      ['[data-test-subj=syntheticsMonitorConfigSchedule]', '3'],
      ['[data-test-subj=syntheticsMonitorConfigName]', httpName],
      ['[data-test-subj=syntheticsMonitorConfigURL]', 'https://elastic.co'],
      ['[data-test-subj=syntheticsMonitorConfigAPMServiceName]', apmServiceName],
    ],
  },
  [FormMonitorType.TCP]: {
    monitorType: FormMonitorType.TCP,
    monitorConfig: {
      ...basicMonitorDetails,
      name: tcpName,
      host: 'smtp.gmail.com:587',
      locations: [basicMonitorDetails.location],
      apmServiceName,
    },
    monitorListDetails: {
      ...basicMonitorDetails,
      name: tcpName,
    },
    monitorEditDetails: [
      ['[data-test-subj=syntheticsMonitorConfigSchedule]', '3'],
      ['[data-test-subj=syntheticsMonitorConfigName]', tcpName],
      ['[data-test-subj=syntheticsMonitorConfigHost]', 'smtp.gmail.com:587'],
      ['[data-test-subj=syntheticsMonitorConfigAPMServiceName]', apmServiceName],
    ],
  },
  [FormMonitorType.ICMP]: {
    monitorType: FormMonitorType.ICMP,
    monitorConfig: {
      ...basicMonitorDetails,
      name: icmpName,
      host: '1.1.1.1',
      locations: [basicMonitorDetails.location],
      apmServiceName,
    },
    monitorListDetails: {
      ...basicMonitorDetails,
      name: icmpName,
    },
    monitorEditDetails: [
      ['[data-test-subj=syntheticsMonitorConfigSchedule]', '3'],
      ['[data-test-subj=syntheticsMonitorConfigName]', icmpName],
      ['[data-test-subj=syntheticsMonitorConfigHost]', '1.1.1.1'],
      ['[data-test-subj=syntheticsMonitorConfigAPMServiceName]', apmServiceName],
      // name: httpName,
    ],
  },
  [FormMonitorType.MULTISTEP]: {
    monitorType: FormMonitorType.MULTISTEP,
    monitorConfig: {
      ...basicMonitorDetails,
      schedule: '10',
      name: browserName,
      inlineScript: 'step("test step", () => {})',
      locations: [basicMonitorDetails.location],
      apmServiceName,
    },
    monitorListDetails: {
      ...basicMonitorDetails,
      schedule: '10',
      name: browserName,
    },
    monitorEditDetails: [
      ['[data-test-subj=syntheticsMonitorConfigSchedule]', '10'],
      ['[data-test-subj=syntheticsMonitorConfigName]', browserName],
      ['[data-test-subj=codeEditorContainer] textarea', 'step("test step", () => {})'],
      ['[data-test-subj=syntheticsMonitorConfigAPMServiceName]', apmServiceName],
    ],
  },
  [`${FormMonitorType.MULTISTEP}__recorder`]: {
    monitorType: FormMonitorType.MULTISTEP,
    monitorConfig: {
      ...basicMonitorDetails,
      schedule: '10',
      name: browserRecorderName,
      recorderScript: 'step("test step", () => {})',
      locations: [basicMonitorDetails.location],
      apmServiceName: 'Sample APM Service',
    },
    monitorListDetails: {
      ...basicMonitorDetails,
      schedule: '10',
      name: browserRecorderName,
    },
    monitorEditDetails: [
      ['[data-test-subj=syntheticsMonitorConfigSchedule]', '10'],
      ['[data-test-subj=syntheticsMonitorConfigName]', browserRecorderName],
      ['[data-test-subj=codeEditorContainer] textarea', 'step("test step", () => {})'],
      // name: httpName,
    ],
  },
};

const createMonitorJourney = ({
  monitorName,
  monitorType,
  monitorConfig,
  monitorListDetails,
  monitorEditDetails,
}: {
  monitorName: string;
  monitorType: FormMonitorType;
  monitorConfig: Record<string, string | string[]>;
  monitorListDetails: Record<string, string>;
  monitorEditDetails: Array<[string, string]>;
}) => {
  journey(
    `Synthetics - add monitor - ${monitorName}`,
    async ({ page, params }: { page: Page; params: any }) => {
      const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });

      step('Go to monitor management', async () => {
        await syntheticsApp.navigateToMonitorManagement();
      });

      step('login to Kibana', async () => {
        await syntheticsApp.loginToKibana();
        const invalid = await page.locator(
          `text=Username or password is incorrect. Please try again.`
        );
        expect(await invalid.isVisible()).toBeFalsy();
      });

      step('Ensure all montiors are deleted', async () => {
        await syntheticsApp.navigateToMonitorManagement();
        await syntheticsApp.waitForLoadingToFinish();
        const isSuccessful = await syntheticsApp.deleteMonitors();
        expect(isSuccessful).toBeTruthy();
      });

      step(`create ${monitorName}`, async () => {
        await syntheticsApp.navigateToAddMonitor();
        await syntheticsApp.createMonitor({ monitorConfig, monitorType });
        const isSuccessful = await syntheticsApp.confirmAndSave();
        expect(isSuccessful).toBeTruthy();
      });

      step(`view ${monitorName} details in Monitor Management UI`, async () => {
        await syntheticsApp.navigateToMonitorManagement();
        const hasFailure = await syntheticsApp.findMonitorConfiguration(monitorListDetails);
        expect(hasFailure).toBeFalsy();
      });

      step(`edit ${monitorName}`, async () => {
        await syntheticsApp.navigateToEditMonitor();
        await syntheticsApp.findByText(monitorListDetails.location);
        const hasFailure = await syntheticsApp.findEditMonitorConfiguration(
          monitorEditDetails,
          monitorType
        );
        expect(hasFailure).toBeFalsy();
      });

      step('delete monitor', async () => {
        await syntheticsApp.navigateToMonitorManagement();
        await syntheticsApp.findByText('Monitor name');
        const isSuccessful = await syntheticsApp.deleteMonitors();
        expect(isSuccessful).toBeTruthy();
      });
    }
  );
};

Object.values(configuration).forEach((config) => {
  createMonitorJourney({
    monitorType: config.monitorType,
    monitorName: `${config.monitorConfig.name} monitor`,
    monitorConfig: config.monitorConfig,
    monitorListDetails: config.monitorListDetails,
    monitorEditDetails: config.monitorEditDetails as Array<[string, string]>,
  });
});
