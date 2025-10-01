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

export class AgentConfigurationsPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('apm')}/settings/agent-configuration`);
    await this.page.waitForLoadingIndicatorHidden();

    // Wait for the page content to load
    await this.page
      .getByRole('heading', { name: 'Settings', level: 1 })
      .waitFor({ timeout: 10000 });

    return this.page;
  }

  async getCreateConfigurationButton() {
    // Wait for the page to be fully loaded
    await this.page
      .getByRole('heading', { name: 'Configurations', exact: true })
      .waitFor({ timeout: 10000 });
    return this.page.getByText('Create configuration');
  }

  async isCreateConfigurationButtonAvailable() {
    try {
      const button = this.page.getByText('Create configuration');
      await button.waitFor({ timeout: 2000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  async hasPermissionsError() {
    try {
      await this.page
        .getByRole('heading', { name: 'Configurations', exact: true })
        .waitFor({ timeout: 10000 });
      return await this.page
        .getByText('Your user may not have the sufficient permissions')
        .isVisible();
    } catch (error) {
      return false;
    }
  }

  async clickCreateConfiguration() {
    const button = await this.getCreateConfigurationButton();
    await button.click();
  }

  async selectService(serviceName: string) {
    await this.page.testSubj.locator('serviceNameComboBox').locator('input').click();
    await this.page.testSubj.locator('serviceNameComboBox').locator('input').fill(serviceName);
    await this.page.testSubj.locator('serviceNameComboBox').locator('input').press('Enter');
  }

  async selectServiceFromDropdown(serviceName: string) {
    // Click the input to open dropdown
    await this.page.testSubj.locator('serviceNameComboBox').locator('input').click();

    // Wait for the dropdown options to appear
    await this.page.testSubj
      .locator('comboBoxOptionsList serviceNameComboBox-optionsList')
      .waitFor({
        state: 'visible',
        timeout: 15000,
      });

    // Use a more generic approach - find any option containing the service name
    const option = this.page.locator(`[role="option"]:has-text("${serviceName}")`);

    // Wait for the specific option to be visible
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
    return serviceName;
  }

  async selectEnvironment(environmentName: string) {
    const environmentComboBox = this.page.testSubj
      .locator('serviceEnvironmentComboBox')
      .locator('input');

    await environmentComboBox.isVisible();
    await environmentComboBox.click();

    // Wait for options list to appear
    const optionsList = this.page.testSubj.locator(
      'comboBoxOptionsList serviceEnvironmentComboBox-optionsList'
    );
    await optionsList.waitFor({
      state: 'visible',
      timeout: 5000,
    });

    // Use generic option selector
    const option = this.page.locator(`[role="option"]:has-text("${environmentName}")`);

    await option.waitFor({ state: 'visible', timeout: 3000 });
    await option.click();
  }

  async clickNextStep() {
    await this.page.getByText('Next step').click();
  }

  async clickEdit() {
    await this.page.getByTestId('apmSettingsPageEditButton').click();
  }

  async selectSettingValue(settingKey: string, value: string) {
    await this.page.testSubj.locator(`row_${settingKey}`).locator('input').fill(value);
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
