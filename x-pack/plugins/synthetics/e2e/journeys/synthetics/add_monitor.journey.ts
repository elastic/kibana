/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { journey, step, expect, Page } from '@elastic/synthetics';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { FormMonitorType } from '../../../common/runtime_types';
import { syntheticsAppPageProvider } from '../../page_objects/synthetics/synthetics_app';

const customLocation = process.env.SYNTHETICS_TEST_LOCATION;

const basicMonitorDetails = {
  location: customLocation || 'US Central',
  schedule: '3',
};
const httpName = `http monitor ${uuidv4()}`;
const icmpName = `icmp monitor ${uuidv4()}`;
const tcpName = `tcp monitor ${uuidv4()}`;
const browserName = `browser monitor ${uuidv4()}`;
const browserRecorderName = `browser monitor recorder ${uuidv4()}`;
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
    `SyntheticsAddMonitor - ${monitorName}`,
    async ({ page, params }: { page: Page; params: any }) => {
      recordVideo(page);

      const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });

      step('Go to monitor management', async () => {
        await syntheticsApp.navigateToMonitorManagement(true);
        await syntheticsApp.enableMonitorManagement();
      });

      step('Ensure all monitors are deleted', async () => {
        await syntheticsApp.waitForLoadingToFinish();
        const isSuccessful = await syntheticsApp.deleteMonitors();
        expect(isSuccessful).toBeTruthy();
      });

      step('handles validation', async () => {
        await syntheticsApp.navigateToAddMonitor();
        await syntheticsApp.ensureIsOnMonitorConfigPage();
        await syntheticsApp.clickByTestSubj('syntheticsMonitorConfigSubmitButton');
        await page.waitForSelector('text=Monitor name is required');
        await page.waitForSelector('text=Monitor script is required');
        const success = page.locator('text=Monitor added successfully.');
        expect(await success.count()).toBe(0);
      });

      step(`create ${monitorName}`, async () => {
        await syntheticsApp.createMonitor({ monitorConfig, monitorType });
        const isSuccessful = await syntheticsApp.confirmAndSave();
        expect(isSuccessful).toBeTruthy();
      });

      step(`view ${monitorName} details in Monitor Management UI`, async () => {
        const hasFailure = await syntheticsApp.findMonitorConfiguration(monitorListDetails);
        expect(hasFailure).toBeFalsy();
      });

      step(`edit ${monitorName}`, async () => {
        await syntheticsApp.navigateToEditMonitor(monitorName);
        await syntheticsApp.findByText(monitorListDetails.location);
        const hasFailure = await syntheticsApp.findEditMonitorConfiguration(
          monitorEditDetails,
          monitorType
        );
        expect(hasFailure).toBeFalsy();
        await page.click('text=Update monitor');
        await page.waitForSelector('text=Monitor updated successfully.');
      });

      step('cannot save monitor with the same name', async () => {
        await syntheticsApp.navigateToAddMonitor();
        await syntheticsApp.createMonitor({ monitorConfig, monitorType });
        await page.waitForSelector('text=Monitor name already exists');
        await syntheticsApp.clickByTestSubj('syntheticsMonitorConfigSubmitButton');
        await page.waitForSelector('text=Cancel');
      });

      step('delete monitor', async () => {
        await syntheticsApp.findByText('Monitor');
        const isSuccessful = await syntheticsApp.deleteMonitors();
        expect(isSuccessful).toBeTruthy();
      });
    }
  );
};

Object.values(configuration).forEach((config) => {
  createMonitorJourney({
    monitorType: config.monitorType,
    monitorName: config.monitorConfig.name,
    monitorConfig: config.monitorConfig,
    monitorListDetails: config.monitorListDetails,
    monitorEditDetails: config.monitorEditDetails as Array<[string, string]>,
  });
});
