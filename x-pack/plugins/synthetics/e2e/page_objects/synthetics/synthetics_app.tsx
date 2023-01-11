/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expect, Page } from '@elastic/synthetics';
import { FormMonitorType } from '../../../common/runtime_types/monitor_management';
import { loginPageProvider } from '../login';
import { utilsPageProvider } from '../utils';

const SIXTY_SEC_TIMEOUT = {
  timeout: 60 * 1000,
};

export function syntheticsAppPageProvider({ page, kibanaUrl }: { page: Page; kibanaUrl: string }) {
  const remoteKibanaUrl = process.env.SYNTHETICS_REMOTE_KIBANA_URL;
  const remoteUsername = process.env.SYNTHETICS_REMOTE_KIBANA_USERNAME;
  const remotePassword = process.env.SYNTHETICS_REMOTE_KIBANA_PASSWORD;
  const isRemote = Boolean(process.env.SYNTHETICS_REMOTE_ENABLED);
  const basePath = isRemote ? remoteKibanaUrl : kibanaUrl;
  const monitorManagement = `${basePath}/app/synthetics/monitors`;
  const settingsPage = `${basePath}/app/synthetics/settings`;
  const addMonitor = `${basePath}/app/synthetics/add-monitor`;
  const overview = `${basePath}/app/synthetics`;

  return {
    ...loginPageProvider({
      page,
      isRemote,
      username: isRemote ? remoteUsername : 'elastic',
      password: isRemote ? remotePassword : 'changeme',
    }),
    ...utilsPageProvider({ page }),

    async navigateToMonitorManagement(doLogin = false) {
      await page.goto(monitorManagement, {
        waitUntil: 'networkidle',
      });
      if (doLogin) {
        await this.loginToKibana();
      }
      await this.waitForMonitorManagementLoadingToFinish();
    },

    async navigateToOverview(doLogin = false) {
      await page.goto(overview, { waitUntil: 'networkidle' });
      if (doLogin) {
        await this.loginToKibana();
      }
    },

    async waitForMonitorManagementLoadingToFinish() {
      while (true) {
        if ((await page.$(this.byTestId('uptimeLoader'))) === null) break;
        await page.waitForTimeout(5 * 1000);
      }
    },

    async getAddMonitorButton() {
      return await this.findByText('Create monitor');
    },

    async navigateToSettings(doLogin = true) {
      await page.goto(settingsPage, {
        waitUntil: 'networkidle',
      });
      if (doLogin) {
        await this.loginToKibana();
      }
    },

    async navigateToAddMonitor() {
      if (await page.isVisible('text=select a different monitor type', { timeout: 0 })) {
        await page.click('text=select a different monitor type');
      } else if (await page.isVisible('text=Create monitor', { timeout: 0 })) {
        await page.click('text=Create monitor');
      } else {
        await page.goto(addMonitor, {
          waitUntil: 'networkidle',
        });
      }
    },

    async ensureIsOnMonitorConfigPage() {
      await page.isVisible('[data-test-subj=monitorSettingsSection]');
    },

    async confirmAndSave() {
      await this.ensureIsOnMonitorConfigPage();
      await this.clickByTestSubj('syntheticsMonitorConfigSubmitButton');
      return await this.findByText('Monitor added successfully.');
    },

    async deleteMonitors() {
      let isSuccessful: boolean = false;
      while (true) {
        if (
          !(await page.isVisible(this.byTestId('euiCollapsedItemActionsButton'), { timeout: 0 }))
        ) {
          isSuccessful = true;
          break;
        }
        await page.click(this.byTestId('euiCollapsedItemActionsButton'), {
          delay: 800,
          force: true,
        });
        await page.click(`.euiContextMenuPanel ${this.byTestId('syntheticsMonitorDeleteAction')}`, {
          delay: 800,
        });
        await page.waitForSelector('[data-test-subj="confirmModalTitleText"]');
        await this.clickByTestSubj('confirmModalConfirmButton');
        isSuccessful = Boolean(await this.findByTestSubj('uptimeDeleteMonitorSuccess'));
        await this.navigateToMonitorManagement();
        await page.waitForTimeout(5 * 1000);
      }
      return isSuccessful;
    },

    async navigateToEditMonitor(monitorName: string) {
      await this.adjustRows();
      await page.waitForSelector('text=Showing');
      await page.click(
        `tr:has-text("${monitorName}") [data-test-subj="euiCollapsedItemActionsButton"]`
      );
      await page.click(`.euiContextMenuPanel ${this.byTestId('syntheticsMonitorEditAction')}`, {
        timeout: 2 * 60 * 1000,
        delay: 800,
      });
      await this.findByText('Edit monitor');
    },

    async selectLocations({ locations }: { locations: string[] }) {
      for (let i = 0; i < locations.length; i++) {
        await page.click(
          this.byTestId(`syntheticsServiceLocation--${locations[i]}`),
          SIXTY_SEC_TIMEOUT
        );
      }
    },

    async selectLocationsAddEdit({ locations }: { locations: string[] }) {
      for (let i = 0; i < locations.length; i++) {
        await page.click(this.byTestId('syntheticsMonitorConfigLocations'));
        await page.click(`text=${locations[i]}`);
      }
    },

    async fillFirstMonitorDetails({ url, locations }: { url: string; locations: string[] }) {
      await this.fillByTestSubj('urls-input', url);
      await page.click(this.byTestId('comboBoxInput'));
      await this.selectLocations({ locations });
      await page.click(this.byTestId('urls-input'));
    },

    async selectMonitorType(monitorType: string) {
      await this.clickByTestSubj(monitorType);
    },

    async findMonitorConfiguration(monitorConfig: Record<string, string>) {
      const values = Object.values(monitorConfig);

      for (let i = 0; i < values.length; i++) {
        await this.findByText(values[i]);
      }
    },

    async findEditMonitorConfiguration(
      monitorConfig: Array<[string, string]>,
      monitorType: FormMonitorType
    ) {
      await page.click('text="Advanced options"');

      for (let i = 0; i < monitorConfig.length; i++) {
        const [selector, expected] = monitorConfig[i];
        const actual = await page.inputValue(selector);
        expect(actual).toEqual(expected);
      }
    },

    async fillCodeEditor(value: string) {
      await page.fill('[data-test-subj=codeEditorContainer] textarea', value);
    },

    async adjustRows() {
      await page.click('[data-test-subj="tablePaginationPopoverButton"]');
      await page.click('text="100 rows"');
      await page.waitForTimeout(3e3);
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
      await this.selectMonitorType('syntheticsMonitorTypeHTTP');
      await this.createBasicMonitorDetails({ name, apmServiceName, locations });
      await this.fillByTestSubj('syntheticsMonitorConfigURL', url);
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
      await this.selectMonitorType('syntheticsMonitorTypeTCP');
      await this.createBasicMonitorDetails({ name, apmServiceName, locations });
      await this.fillByTestSubj('syntheticsMonitorConfigHost', host);
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
      await this.selectMonitorType('syntheticsMonitorTypeICMP');
      await this.createBasicMonitorDetails({ name, apmServiceName, locations });
      await this.fillByTestSubj('syntheticsMonitorConfigHost', host);
    },

    async createBasicBrowserMonitorDetails({
      name,
      inlineScript,
      recorderScript,
      params,
      username,
      password,
      apmServiceName,
      locations,
    }: {
      name: string;
      inlineScript?: string;
      recorderScript?: string;
      params?: string;
      username?: string;
      password?: string;
      apmServiceName: string;
      locations: string[];
    }) {
      await this.createBasicMonitorDetails({ name, apmServiceName, locations });
      if (inlineScript) {
        await this.clickByTestSubj('syntheticsSourceTab__inline');
        await this.fillCodeEditor(inlineScript);
        return;
      }
      if (recorderScript) {
        // Upload buffer from memory
        await page.setInputFiles('input[data-test-subj=syntheticsFleetScriptRecorderUploader]', {
          name: 'file.js',
          mimeType: 'text/javascript',
          buffer: Buffer.from(recorderScript),
        });
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
      await page.click('text="Advanced options"');
      await this.fillByTestSubj('syntheticsMonitorConfigName', name);
      await this.fillByTestSubj('syntheticsMonitorConfigAPMServiceName', apmServiceName);
      await this.selectLocationsAddEdit({ locations });
    },

    async createMonitor({
      monitorConfig,
      monitorType,
    }: {
      monitorConfig: Record<string, string | string[]>;
      monitorType: FormMonitorType;
    }) {
      switch (monitorType) {
        case FormMonitorType.HTTP:
          // @ts-ignore
          await this.createBasicHTTPMonitorDetails(monitorConfig);
          break;
        case FormMonitorType.TCP:
          // @ts-ignore
          await this.createBasicTCPMonitorDetails(monitorConfig);
          break;
        case FormMonitorType.ICMP:
          // @ts-ignore
          await this.createBasicICMPMonitorDetails(monitorConfig);
          break;
        case FormMonitorType.MULTISTEP:
          // @ts-ignore
          await this.createBasicBrowserMonitorDetails(monitorConfig);
          break;
        default:
          break;
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
    },
    async checkIsEnabled() {
      await page.waitForTimeout(5 * 1000);
      const addMonitorBtn = await this.getAddMonitorButton();
      const isDisabled = await addMonitorBtn.isDisabled();
      return !isDisabled;
    },
  };
}
