/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt';
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

    // Find the newly added select (will be empty) - check from the end
    const updatedSelects = this.page.locator('select[data-test-subj]');
    const newEmptySelectIndex = await updatedSelects.evaluateAll((selects) => {
      for (let i = selects.length - 1; i >= 0; i--) {
        const select = selects[i] as HTMLSelectElement;
        if (select.value === '' || select.value === 'DEFAULT') {
          return i;
        }
      }
      return -1;
    });
    if (newEmptySelectIndex >= 0) {
      const selectIds = await updatedSelects.evaluateAll((selects) =>
        selects.map((s) => s.getAttribute('data-test-subj'))
      );
      const newEmptySelectId = selectIds[newEmptySelectIndex];
      if (newEmptySelectId) {
        const targetSelect = this.page.getByTestId(newEmptySelectId);
        await targetSelect.selectOption(key);
      }
    }

    // Wait for the value input (EuiComboBox) to appear
    // The value input uses data-test-subj="{key}.value"
    const valueInput = this.page.getByTestId(`${key}.value`);
    await valueInput.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });

    // EuiComboBox: click to focus, type the value, wait for suggestions, then press Enter
    await valueInput.click();
    await expect(this.page.getByRole('listbox')).toBeVisible();

    const button = this.page.getByTestId('apmCustomLinkFiltersSectionButton');
    const buttonCount = await button.count();

    if (buttonCount > 1) {
      await this.page.getByTestId(`${key}.value`).getByTestId('comboBoxSearchInput').fill(value);
      await this.page.getByTestId(`${key}.value`).getByTestId('comboBoxSearchInput').press('Enter');
      await this.page.getByTestId(`${key}.value`).getByTestId('comboBoxSearchInput').blur();
    } else {
      await this.page.getByTestId('comboBoxSearchInput').fill(value);
      await this.page.getByTestId('comboBoxSearchInput').press('Enter');
      await this.page.getByTestId('comboBoxSearchInput').blur();
    }
  }
}
