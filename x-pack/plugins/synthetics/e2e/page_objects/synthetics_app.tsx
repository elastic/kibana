/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Page } from '@elastic/synthetics';
import { loginPageProvider } from './login';
import { utilsPageProvider } from './utils';

export function syntheticsAppPageProvider({ page, kibanaUrl }: { page: Page; kibanaUrl: string }) {
  const remoteKibanaUrl = process.env.SYNTHETICS_REMOTE_KIBANA_URL;
  const remoteUsername = process.env.SYNTHETICS_REMOTE_KIBANA_USERNAME;
  const remotePassword = process.env.SYNTHETICS_REMOTE_KIBANA_PASSWORD;
  const isRemote = Boolean(process.env.SYNTHETICS_REMOTE_ENABLED);
  const basePath = isRemote ? remoteKibanaUrl : kibanaUrl;
  const monitorManagement = `${basePath}/app/synthetics/manage-monitors`;
  const addMonitor = `${basePath}/app/uptime/add-monitor`;
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

    async getAddMonitorButton() {
      return await this.findByTestSubj('syntheticsAddMonitorBtn');
    },

    async navigateToAddMonitor() {
      await page.goto(addMonitor, {
        waitUntil: 'networkidle',
      });
    },

    async ensureIsOnMonitorConfigPage() {
      await page.isVisible('[data-test-subj=monitorSettingsSection]');
    },

    async confirmAndSave(isEditPage?: boolean) {
      await this.ensureIsOnMonitorConfigPage();
      if (isEditPage) {
        await page.click('text=Update monitor');
      } else {
        await page.click('text=Create monitor');
      }
      return await this.findByText('Monitor added successfully.');
    },

    async selectLocations({ locations }: { locations: string[] }) {
      for (let i = 0; i < locations.length; i++) {
        await page.click(this.byTestId(`syntheticsServiceLocation--${locations[i]}`));
      }
    },

    async fillFirstMonitorDetails({
      url,
      apmServiceName,
      locations,
    }: {
      url: string;
      apmServiceName: string;
      locations: string[];
    }) {
      await this.fillByTestSubj('urls-input', url);
      await page.click(this.byTestId('comboBoxInput'));
      await this.selectLocations({ locations });
      await page.click(this.byTestId('urls-input'));
    },
  };
}
