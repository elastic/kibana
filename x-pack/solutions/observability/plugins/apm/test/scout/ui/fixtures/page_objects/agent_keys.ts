/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { waitForApmSettingsHeaderLink } from '../page_helpers';

export class AgentKeysPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('apm')}/settings/agent-keys`);
    await waitForApmSettingsHeaderLink(this.page);
    this.page.getByRole('heading', { name: 'Settings', level: 1 });

    return this.page;
  }

  getCreateButtonLocator() {
    return this.page.testSubj.locator('apmAgentKeysContentCreateApmAgentKeyButton');
  }

  async clickCreateButton() {
    const button = this.getCreateButtonLocator();
    await button.click();
  }

  async fillKeyName(keyName: string) {
    await this.page.testSubj.locator('apmCreateAgentKeyFlyoutFieldText').fill(keyName);
  }

  async clickCreateKeyButton() {
    await this.page.testSubj.locator('apmCreateAgentKeyFlyoutButton').click();
  }
  async createAndDeleteKey(keyName: string) {
    await this.clickCreateButton();
    await this.fillKeyName(keyName);
    await this.clickCreateKeyButton();
    await this.page.getByRole('button', { name: 'Delete' }).click();
    await this.page.getByTestId('confirmModalConfirmButton').click();
    const deletedConfirmationText = this.page.getByText(`Deleted APM agent key "${keyName}"`);
    await deletedConfirmationText.waitFor({ state: 'visible', timeout: 5000 });
  }
}
