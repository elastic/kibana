/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt';
import { waitForApmSettingsHeaderLink } from '../page_helpers';
import { BIGGER_TIMEOUT } from '../constants';

export class CustomLinksPage {
  public saveButton: Locator;
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.saveButton = this.page.testSubj.locator('apmCustomLinkFlyoutFooterSaveButton');
  }

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('apm')}/settings/custom-links`);
    return await waitForApmSettingsHeaderLink(this.page);
  }

  async getCreateCustomLinkButton() {
    return this.page.testSubj.locator('createButton');
  }

  async clickCreateCustomLink() {
    const button = await this.getCreateCustomLinkButton();
    await button.click();

    // Wait for the create form to appear
    await this.page
      .getByRole('heading', { name: 'Create link', level: 2 })
      .waitFor({ state: 'visible' });
  }

  async fillLabel(label: string) {
    await this.page.locator('input[name="label"]').fill(label);
  }

  async fillUrl(url: string) {
    await this.page.locator('input[name="url"]').fill(url);
  }

  async clickSave() {
    // Wait for save button to be enabled (after filling required fields)
    const saveButton = this.saveButton;
    await saveButton.waitFor({ state: 'visible' });
    await expect(saveButton).toBeEnabled();

    const flyoutHeading = this.page.getByRole('heading', { name: 'Create link', level: 2 });
    await expect(flyoutHeading).toBeVisible();

    await saveButton.click();
    await flyoutHeading.waitFor({ state: 'hidden', timeout: BIGGER_TIMEOUT });
  }

  async clickDelete() {
    await this.page.getByTestId('apmDeleteButtonDeleteButton').click();
  }

  async getEditCustomLinkButton() {
    return this.page.testSubj.locator('editCustomLink');
  }

  getCustomLinkRow(labelText: string): Locator {
    return this.page.testSubj.locator(`customLinkRow-${labelText}`);
  }

  async clickEditCustomLinkForRow(labelText: string) {
    // First, wait for the row to be visible - this ensures the table has loaded
    const row = this.getCustomLinkRow(labelText);
    await row.waitFor({ state: 'visible', timeout: BIGGER_TIMEOUT });

    const table = this.page.testSubj.locator('customLinksTable').locator('table');
    try {
      await table.waitFor({ state: 'visible', timeout: 5000 });
      await expect(table).not.toHaveAttribute('aria-busy', 'true', { timeout: BIGGER_TIMEOUT });
    } catch {
      console.warn('Custom links table did not become stable in time');
    }

    // Wait for the edit button to be visible and stable before clicking
    const editButton = row.getByTestId('editCustomLink');
    await editButton.waitFor({ state: 'visible', timeout: BIGGER_TIMEOUT });
    await editButton.click();
  }
}
