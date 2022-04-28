/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Page } from '@elastic/synthetics';
import { DataStream } from '../../common/runtime_types/monitor_management';
import { getQuerystring } from '../journeys/utils';
import { loginPageProvider } from './login';
import { utilsPageProvider } from './utils';

export function monitorManagementPageProvider({
  page,
  kibanaUrl,
}: {
  page: Page;
  kibanaUrl: string;
}) {
  const remoteKibanaUrl = process.env.SYNTHETICS_REMOTE_KIBANA_URL;
  const remoteUsername = process.env.SYNTHETICS_REMOTE_KIBANA_USERNAME;
  const remotePassword = process.env.SYNTHETICS_REMOTE_KIBANA_PASSWORD;
  const isRemote = Boolean(process.env.SYNTHETICS_REMOTE_ENABLED);
  const basePath = isRemote ? remoteKibanaUrl : kibanaUrl;
  const monitorManagement = `${basePath}/app/uptime/manage-monitors/all`;
  const addMonitor = `${basePath}/app/uptime/add-monitor`;
  const overview = `${basePath}/app/uptime`;
  return {
    ...loginPageProvider({
      page,
      isRemote,
      username: isRemote ? remoteUsername : 'elastic',
      password: isRemote ? remotePassword : 'changeme',
    }),
    ...utilsPageProvider({ page }),

    async navigateToMonitorManagement() {
      await page.goto(monitorManagement, {
        waitUntil: 'networkidle',
      });
      await this.waitForMonitorManagementLoadingToFinish();
    },

    async waitForMonitorManagementLoadingToFinish() {
      while (true) {
        if ((await page.$(this.byTestId('uptimeLoader'))) === null) break;
        await page.waitForTimeout(5 * 1000);
      }
    },

    async enableMonitorManagement(shouldEnable: boolean = true) {
      const isEnabled = await this.checkIsEnabled();
      if (isEnabled === shouldEnable) {
        return;
      }
      const [toggle, button] = await Promise.all([
        page.$(this.byTestId('syntheticsEnableSwitch')),
        page.$(this.byTestId('syntheticsEnableButton')),
      ]);

      if (toggle === null && button === null) {
        return null;
      }
      if (toggle) {
        if (isEnabled !== shouldEnable) {
          await toggle.click();
        }
      } else {
        await button?.click();
      }
      if (shouldEnable) {
        await this.findByText('Monitor Management enabled successfully.');
      } else {
        await this.findByText('Monitor Management disabled successfully.');
      }
    },

    async getEnableToggle() {
      return await this.findByTestSubj('syntheticsEnableSwitch');
    },

    async getEnableButton() {
      return await this.findByTestSubj('syntheticsEnableSwitch');
    },

    async getAddMonitorButton() {
      return await this.findByTestSubj('syntheticsAddMonitorBtn');
    },

    async checkIsEnabled() {
      await page.waitForTimeout(5 * 1000);
      const addMonitorBtn = await this.getAddMonitorButton();
      const isDisabled = await addMonitorBtn.isDisabled();
      return !isDisabled;
    },

    async navigateToAddMonitor() {
      await page.goto(addMonitor, {
        waitUntil: 'networkidle',
      });
    },

    async navigateToOverviewPage(options?: object) {
      await page.goto(`${overview}${options ? `?${getQuerystring(options)}` : ''}`, {
        waitUntil: 'networkidle',
      });
    },

    async clickAddMonitor() {
      await page.click('text=Add monitor');
    },

    async deleteMonitors() {
      let isSuccessful: boolean = false;
      await page.waitForSelector('[data-test-subj="monitorManagementDeleteMonitor"]');
      while (true) {
        if ((await page.$(this.byTestId('monitorManagementDeleteMonitor'))) === null) break;
        await page.click(this.byTestId('monitorManagementDeleteMonitor'), { delay: 800 });
        await page.waitForSelector('[data-test-subj="confirmModalTitleText"]');
        await this.clickByTestSubj('confirmModalConfirmButton');
        isSuccessful = Boolean(await this.findByTestSubj('uptimeDeleteMonitorSuccess'));
        await page.waitForTimeout(5 * 1000);
      }
      return isSuccessful;
    },

    async editMonitor() {
      await page.click(this.byTestId('monitorManagementEditMonitor'), { delay: 800 });
    },

    async findMonitorConfiguration(monitorConfig: Record<string, string>) {
      const values = Object.values(monitorConfig);

      for (let i = 0; i < values.length; i++) {
        await this.findByText(values[i]);
      }
    },

    async selectMonitorType(monitorType: string) {
      await this.selectByTestSubj('syntheticsMonitorTypeField', monitorType);
    },

    async ensureIsOnMonitorConfigPage() {
      await page.isVisible('[data-test-subj=monitorSettingsSection]');
    },

    async confirmAndSave(isEditPage?: boolean) {
      await this.ensureIsOnMonitorConfigPage();
      if (isEditPage) {
        await page.click('text=Update monitor');
      } else {
        await page.click('text=Save monitor');
      }
      return await this.findByText('Monitor added successfully.');
    },

    async fillCodeEditor(value: string) {
      await page.fill('[data-test-subj=codeEditorContainer] textarea', value);
    },

    async selectLocations({ locations }: { locations: string[] }) {
      for (let i = 0; i < locations.length; i++) {
        await page.check(`text=${locations[i]}`);
      }
    },

    async createBasicMonitorDetails({
      name,
      apmServiceName,
      locations,
    }: {
      name: string;
      apmServiceName: string;
      locations: string[];
    }) {
      await this.fillByTestSubj('monitorManagementMonitorName', name);
      await this.fillByTestSubj('syntheticsAPMServiceName', apmServiceName);
      await this.selectLocations({ locations });
    },

    async createBasicHTTPMonitorDetails({
      name,
      url,
      apmServiceName,
      locations,
    }: {
      name: string;
      url: string;
      apmServiceName: string;
      locations: string[];
    }) {
      await this.createBasicMonitorDetails({ name, apmServiceName, locations });
      await this.fillByTestSubj('syntheticsUrlField', url);
    },

    async createBasicTCPMonitorDetails({
      name,
      host,
      apmServiceName,
      locations,
    }: {
      name: string;
      host: string;
      apmServiceName: string;
      locations: string[];
    }) {
      await this.selectMonitorType('tcp');
      await this.createBasicMonitorDetails({ name, apmServiceName, locations });
      await this.fillByTestSubj('syntheticsTCPHostField', host);
    },

    async createBasicICMPMonitorDetails({
      name,
      host,
      apmServiceName,
      locations,
    }: {
      name: string;
      host: string;
      apmServiceName: string;
      locations: string[];
    }) {
      await this.selectMonitorType('icmp');
      await this.createBasicMonitorDetails({ name, apmServiceName, locations });
      await this.fillByTestSubj('syntheticsICMPHostField', host);
    },

    async createBasicBrowserMonitorDetails(
      {
        name,
        inlineScript,
        zipUrl,
        folder,
        params,
        username,
        password,
        apmServiceName,
        locations,
      }: {
        name: string;
        inlineScript?: string;
        zipUrl?: string;
        folder?: string;
        params?: string;
        username?: string;
        password?: string;
        apmServiceName: string;
        locations: string[];
      },
      isInline: boolean = false
    ) {
      await this.selectMonitorType('browser');
      await this.createBasicMonitorDetails({ name, apmServiceName, locations });
      if (isInline && inlineScript) {
        await this.clickByTestSubj('syntheticsSourceTab__inline');
        await this.fillCodeEditor(inlineScript);
        return;
      }
      await this.fillByTestSubj('syntheticsBrowserZipUrl', zipUrl || '');
      await this.fillByTestSubj('syntheticsBrowserZipUrlFolder', folder || '');
      await this.fillByTestSubj('syntheticsBrowserZipUrlUsername', username || '');
      await this.fillByTestSubj('syntheticsBrowserZipUrlPassword', password || '');
      await this.fillCodeEditor(params || '');
    },

    async createMonitor({
      monitorConfig,
      monitorType,
    }: {
      monitorConfig: Record<string, string | string[]>;
      monitorType: DataStream;
    }) {
      switch (monitorType) {
        case DataStream.HTTP:
          // @ts-ignore
          await this.createBasicHTTPMonitorDetails(monitorConfig);
          break;
        case DataStream.TCP:
          // @ts-ignore
          await this.createBasicTCPMonitorDetails(monitorConfig);
          break;
        case DataStream.ICMP:
          // @ts-ignore
          await this.createBasicICMPMonitorDetails(monitorConfig);
          break;
        case DataStream.BROWSER:
          // @ts-ignore
          await this.createBasicBrowserMonitorDetails(monitorConfig, true);
          break;
        default:
          break;
      }
    },
  };
}
