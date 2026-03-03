/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { EuiComboBoxWrapper, EuiFieldTextWrapper } from '@kbn/scout-oblt';
import { waitForApmMainContainer } from '../page_helpers';

export class AgentConfigurationsPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('apm')}/settings/agent-configuration`);
    await waitForApmMainContainer(this.page);

    // Wait for the page content to load
    await this.page.getByRole('heading', { name: 'Settings', level: 1 }).waitFor();
  }

  async getCreateConfigurationButton() {
    // Wait for the page to be fully loaded
    await this.page.getByRole('heading', { name: 'Configurations', exact: true }).waitFor();

    return this.page.getByText('Create configuration');
  }

  async isCreateConfigurationButtonAvailable() {
    try {
      const button = this.page.getByText('Create configuration');
      await button.waitFor({ state: 'visible' });
      return true;
    } catch {
      return false;
    }
  }

  async hasPermissionsError() {
    try {
      this.page.getByRole('heading', { name: 'Configurations', exact: true });

      return await this.page
        .getByText('Your user may not have the sufficient permissions')
        .isVisible();
    } catch {
      return false;
    }
  }

  async clickCreateConfiguration() {
    const button = await this.getCreateConfigurationButton();
    await button.click();
  }

  async selectServiceFromDropdown(serviceName: string) {
    const serviceComboBox = new EuiComboBoxWrapper(this.page, 'serviceNameComboBox');
    return await serviceComboBox.selectSingleOption(serviceName);
  }

  async selectEnvironment(environmentName: string) {
    // Use direct input approach that we know works
    const environmentInput = this.page.testSubj
      .locator('serviceEnvironmentComboBox')
      .locator('input');
    await environmentInput.click();
    await environmentInput.fill(environmentName);
    await this.page.keyboard.press('Enter');
  }

  async clickNextStep() {
    await this.page.getByText('Next step').click();
  }

  async clickEdit() {
    await this.page.getByTestId('apmSettingsPageEditButton').click();
  }

  async selectSettingValue(settingKey: string, value: string) {
    const inputField = new EuiFieldTextWrapper(this.page, {
      dataTestSubj: `row_${settingKey}`,
    });
    await inputField.fill(value);
  }

  async clickSaveConfiguration() {
    await this.page.getByText('Save configuration').click();
  }

  async clickDeleteConfiguration() {
    await this.page.getByLabel('Delete').click();
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
  }

  async checkConfigurationExists(serviceName: string, environment: string) {
    const columnButtons = this.page.testSubj.locator('apmColumnsButton');
    await columnButtons.getByText(serviceName).isVisible();
    await columnButtons.getByText(environment).isVisible();
  }
}
