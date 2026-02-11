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

  /**
   * Explicitly adds a new filter row by clicking the "Add another filter" button.
   * Throws an error if the button is disabled.
   */
  async addNewFilterRow() {
    const addFilterButton = this.page.getByTestId(
      'apmCustomLinkAddFilterButtonAddAnotherFilterButton'
    );
    await addFilterButton.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    await expect(addFilterButton).toBeEnabled();
    await addFilterButton.click();
  }

  /**
   * Fills an existing empty filter row with the given key and value.
   * Uses the explicit data-test-subj attribute for empty filter rows.
   * Throws an error if no empty filter row is found.
   */
  async fillEmptyFilter(key: string, value: string) {
    const emptyFilterSelect = this.page.getByTestId('apmCustomLinkFilterSelectEmpty');
    await emptyFilterSelect.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    await emptyFilterSelect.selectOption(key);

    const valueInput = this.page.getByTestId(`${key}.value`);
    await valueInput.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });

    const valueComboBox = new EuiComboBoxWrapper(this.page, { dataTestSubj: `${key}.value` });
    await valueComboBox.selectSingleOption(value);
  }

  /**
   * Adds the first filter by filling the existing empty filter row.
   * Use this when the form has just been opened and contains one empty filter row.
   * This method does NOT click the "Add another filter" button.
   */
  async addFirstFilter(key: string, value: string) {
    await this.fillEmptyFilter(key, value);
  }

  /**
   * Adds an additional filter by explicitly clicking the "Add another filter" button,
   * then filling the newly created empty filter row.
   * Use this when you need to add a second, third, etc. filter.
   */
  async addAdditionalFilter(key: string, value: string) {
    await this.addNewFilterRow();
    await this.fillEmptyFilter(key, value);
  }
}
