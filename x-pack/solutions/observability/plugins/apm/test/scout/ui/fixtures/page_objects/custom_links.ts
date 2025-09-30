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

  async deleteAllCustomLinksFromUI() {
    await this.goto();

    // Check if empty prompt is visible - if so, no links to delete
    const emptyPrompt = this.page.getByTestId('customLinksEmptyPrompt');
    if (await emptyPrompt.isVisible()) {
      return; // No links to delete
    }

    // Keep deleting custom links while they exist
    let maxAttempts = 10; // Safety limit
    while (maxAttempts > 0) {
      // Check if any edit buttons exist
      const editButtons = this.page.testSubj.locator('editCustomLink');
      const count = await editButtons.count();

      if (count > 0) {
        // Click the first available edit button
        await editButtons.click();

        // Wait for the edit form and click delete
        await this.page.getByText('Delete').waitFor({ state: 'visible', timeout: 5000 });
        await this.page.getByText('Delete').click();

        // Wait for deletion to complete - check if empty prompt appears or count decreases
        await this.page.waitForLoadingIndicatorHidden();

        // If empty prompt appears, we're done
        if (await emptyPrompt.isVisible()) {
          break;
        }
      } else {
        break; // No more links
      }

      maxAttempts--;
    }
  }

  async getCustomLinksEmptyPrompt() {
    return this.page.testSubj.locator('customLinksEmptyPrompt');
  }
}
