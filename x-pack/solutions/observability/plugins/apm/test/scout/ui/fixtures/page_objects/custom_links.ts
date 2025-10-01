/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt';

export class CustomLinksPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('apm')}/settings/custom-links`);
    return this.page.waitForLoadingIndicatorHidden();
  }

  async getCreateCustomLinkButton() {
    return this.page.getByText('Create custom link');
  }

  async clickCreateCustomLink() {
    const button = await this.getCreateCustomLinkButton();
    await button.click();

    // Wait for the create form to appear
    await this.page.getByText('Create link').waitFor({ state: 'visible' });
  }

  async fillLabel(label: string) {
    await this.page.locator('input[name="label"]').fill(label);
  }

  async fillUrl(url: string) {
    await this.page.locator('input[name="url"]').fill(url);
  }

  async clickSave() {
    // Wait for save button to be enabled (after filling required fields)
    await this.page.getByText('Save').waitFor({ state: 'visible' });
    const saveButton = this.page.getByText('Save');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
  }

  async clickDelete() {
    // Click the actual delete button, not any text that says "Delete"
    await this.page.getByRole('button', { name: 'Delete' }).click();
  }

  async getEditCustomLinkButton() {
    return this.page.testSubj.locator('editCustomLink');
  }

  async clickEditCustomLinkForRow(labelText: string) {
    // Click edit button for a specific custom link by finding its row first
    const row = this.page.locator(`tr:has-text("${labelText}")`);
    const editButton = row.locator('[data-test-subj="editCustomLink"]');
    await editButton.click();
  }
}
