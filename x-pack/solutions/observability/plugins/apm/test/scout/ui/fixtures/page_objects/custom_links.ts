/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect, EuiComboBoxWrapper } from '@kbn/scout-oblt';
import { waitForApmSettingsHeaderLink } from '../page_helpers';
import { EXTENDED_TIMEOUT } from '../constants';

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
    await saveButton.click();
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
    // EuiBasicTable adds aria-busy="true" when loading
    const table = this.page.testSubj.locator('customLinksTable').locator('table');
    await expect(table).not.toHaveAttribute('aria-busy', 'true', { timeout: EXTENDED_TIMEOUT });

    // Click edit button for a specific custom link by finding its row first
    const row = this.getCustomLinkRow(labelText);
    // Wait for the row to be visible before clicking to avoid race conditions
    await row.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });

    // Wait for the edit button to be visible and stable before clicking
    const editButton = row.getByTestId('editCustomLink');
    await editButton.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    await editButton.click();
  }

  async addFilter(key: string, value: string) {
    // Check if we need to add a new filter row
    const addFilterButton = this.page.getByTestId(
      'apmCustomLinkAddFilterButtonAddAnotherFilterButton'
    );
    const isDisabled = await addFilterButton.getAttribute('disabled');

    if (isDisabled === null) {
      await addFilterButton.click();
    }

    // Find the newly added empty select (value is empty or DEFAULT)
    const allSelects = this.page.locator('select[data-test-subj]');
    const emptySelectTestSubj = await allSelects.evaluateAll((selects) => {
      for (let i = selects.length - 1; i >= 0; i--) {
        const select = selects[i] as HTMLSelectElement;
        if (select.value === '' || select.value === 'DEFAULT') {
          return select.getAttribute('data-test-subj');
        }
      }
      return null;
    });

    if (emptySelectTestSubj) {
      await this.page.getByTestId(emptySelectTestSubj).selectOption(key);
    }

    const valueInput = this.page.getByTestId(`${key}.value`);
    await valueInput.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });

    const valueComboBox = new EuiComboBoxWrapper(this.page, { dataTestSubj: `${key}.value` });
    await valueComboBox.selectSingleOption(value);
  }
}
