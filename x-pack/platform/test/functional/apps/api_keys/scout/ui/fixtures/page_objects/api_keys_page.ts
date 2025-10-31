/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
export class ApiKeysPage {
  // Element locators
  readonly noApiKeysHeader;
  readonly apiKeyAdminDescriptionCallOut;
  readonly goToConsoleButton;
  readonly apiKeysPermissionDeniedMessage;
  readonly apiKeysCreatePromptButton;
  readonly apiKeysCreateTableButton;
  readonly apiKeyNameInput;
  readonly apiKeyCustomExpirationInput;
  readonly apiKeyCustomExpirationSwitch;
  readonly formFlyoutSubmitButton;
  readonly formFlyoutCancelButton;
  readonly checkboxSelectAll;
  readonly bulkInvalidateActionButton;
  readonly confirmModalConfirmButton;
  readonly apiKeysMetadataSwitch;
  readonly apiKeysRoleDescriptorsSwitch;
  readonly apiKeyStatus;
  readonly updateApiKeySuccessToast;
  readonly activeFilterButton;
  readonly expiredFilterButton;
  readonly personalFilterButton;
  readonly managedFilterButton;
  readonly crossClusterFilterButton;
  readonly ownerFilterButton;
  readonly apiKeysSearchBar;

  constructor(private readonly page: ScoutPage) {
    // Initialize all locators in the constructor
    this.noApiKeysHeader = this.page.testSubj.locator('noApiKeysHeader');
    this.apiKeyAdminDescriptionCallOut = this.page.testSubj.locator(
      'apiKeyAdminDescriptionCallOut'
    );
    this.goToConsoleButton = this.page.testSubj.locator('goToConsoleButton');
    this.apiKeysPermissionDeniedMessage = this.page.testSubj.locator(
      'apiKeysPermissionDeniedMessage'
    );
    this.apiKeysCreatePromptButton = this.page.testSubj.locator('apiKeysCreatePromptButton');
    this.apiKeysCreateTableButton = this.page.testSubj.locator('apiKeysCreateTableButton');
    this.apiKeyNameInput = this.page.testSubj.locator('apiKeyNameInput');
    this.apiKeyCustomExpirationInput = this.page.testSubj.locator('apiKeyCustomExpirationInput');
    this.apiKeyCustomExpirationSwitch = this.page.testSubj.locator('apiKeyCustomExpirationSwitch');
    this.formFlyoutSubmitButton = this.page.testSubj.locator('formFlyoutSubmitButton');
    this.formFlyoutCancelButton = this.page.testSubj.locator('formFlyoutCancelButton');
    this.checkboxSelectAll = this.page.testSubj.locator('checkboxSelectAll');
    this.bulkInvalidateActionButton = this.page.testSubj.locator('bulkInvalidateActionButton');
    this.confirmModalConfirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
    this.apiKeysMetadataSwitch = this.page.testSubj.locator('apiKeysMetadataSwitch');
    this.apiKeysRoleDescriptorsSwitch = this.page.testSubj.locator('apiKeysRoleDescriptorsSwitch');
    this.apiKeyStatus = this.page.testSubj
      .locator('apiKeyFlyout')
      .locator('[data-test-subj="apiKeyStatus"]');
    this.updateApiKeySuccessToast = this.page.testSubj.locator('updateApiKeySuccessToast');
    this.activeFilterButton = this.page.testSubj.locator('activeFilterButton');
    this.expiredFilterButton = this.page.testSubj.locator('expiredFilterButton');
    this.personalFilterButton = this.page.testSubj.locator('personalFilterButton');
    this.managedFilterButton = this.page.testSubj.locator('managedFilterButton');
    this.crossClusterFilterButton = this.page.testSubj.locator('crossClusterFilterButton');
    this.ownerFilterButton = this.page.testSubj.locator('ownerFilterButton');
    this.apiKeysSearchBar = this.page.testSubj.locator('apiKeysSearchBar');
  }

  /**
   * Navigate to the API Keys management page
   */
  async goto() {
    await this.page.gotoApp('management/security/api_keys');
  }

  /**
   * Get the text from the "no API keys" header
   */
  async noAPIKeysHeading() {
    return await this.noApiKeysHeader.innerText();
  }

  /**
   * Get the API key admin description text
   */
  async getApiKeyAdminDesc() {
    return await this.apiKeyAdminDescriptionCallOut.innerText();
  }

  /**
   * Get the "Go to Console" button element
   */
  async getGoToConsoleButton() {
    return this.goToConsoleButton;
  }

  /**
   * Get the permission denied message text
   */
  async getApiKeysPermissionDeniedMessage() {
    return await this.apiKeysPermissionDeniedMessage.innerText();
  }

  /**
   * Click the "Create API key" button on the empty prompt page
   */
  async clickOnPromptCreateApiKey() {
    await this.apiKeysCreatePromptButton.click();
  }

  /**
   * Click the "Create API key" button on the table view
   */
  async clickOnTableCreateApiKey() {
    await this.apiKeysCreateTableButton.click();
  }

  /**
   * Set the API key name in the input field
   */
  async setApiKeyName(apiKeyName: string) {
    await this.apiKeyNameInput.fill(apiKeyName);
  }

  /**
   * Get the API key name input element
   */
  async getApiKeyName() {
    return this.apiKeyNameInput;
  }

  /**
   * Check if the API key name input is present
   */
  async isApiKeyNamePresent() {
    return await this.apiKeyNameInput.isVisible({ timeout: 500 }).catch(() => false);
  }

  /**
   * Set a custom expiration time for the API key
   */
  async setApiKeyCustomExpiration(expirationTime: string) {
    await this.apiKeyCustomExpirationInput.fill(expirationTime);
  }

  /**
   * Toggle the custom expiration switch
   */
  async toggleCustomExpiration() {
    await this.apiKeyCustomExpirationSwitch.click();
  }

  /**
   * Click the submit button on the API key flyout
   */
  async clickSubmitButtonOnApiKeyFlyout() {
    await this.formFlyoutSubmitButton.click();
  }

  /**
   * Wait for the submit button to be enabled
   */
  async waitForSubmitButtonOnApiKeyFlyoutEnabled() {
    await this.formFlyoutSubmitButton.waitFor({ state: 'visible' });
    await this.page.waitForTimeout(10000); // Wait up to 10 seconds for the button to be enabled
    return await this.formFlyoutSubmitButton.isEnabled();
  }

  /**
   * Click the cancel button on the API key flyout
   */
  async clickCancelButtonOnApiKeyFlyout() {
    await this.formFlyoutCancelButton.click();
  }

  /**
   * Check if the API key modal/flyout exists
   */
  async isApiKeyModalExists() {
    return await this.page
      .locator('.euiFlyoutHeader')
      .isVisible()
      .catch(() => false);
  }

  /**
   * Get the new API key creation message
   */
  async getNewApiKeyCreation() {
    const euiCallOutHeader = this.page.locator('.euiCallOutHeader__title');
    return await euiCallOutHeader.innerText();
  }

  /**
   * Check if we're on the prompt page (no API keys exist)
   */
  async isPromptPage() {
    return await this.apiKeysCreatePromptButton.isVisible().catch(() => false);
  }

  /**
   * Get the title text from the first prompt
   */
  async getApiKeysFirstPromptTitle() {
    const titlePromptElem = this.page.locator('.euiEmptyPrompt .euiTitle');
    return await titlePromptElem.innerText();
  }

  /**
   * Delete a specific API key by name
   */
  async deleteApiKeyByName(apiKeyName: string) {
    await this.page.testSubj.locator(`apiKeysTableDeleteAction-${apiKeyName}`).click();
    await this.confirmModalConfirmButton.click();
    await this.page.testSubj.locator(`apiKeyRowName-${apiKeyName}`).waitFor({ state: 'detached' });
  }

  /**
   * Delete all API keys one by one
   */
  async deleteAllApiKeyOneByOne() {
    const deleteButtons = this.page.testSubj.locator('^apiKeysTableDeleteAction');
    const count = await deleteButtons.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const currentCount = await deleteButtons.count();
        await deleteButtons.first().click();
        await this.confirmModalConfirmButton.click();

        // Wait for the delete button count to decrease by polling
        const startTime = Date.now();
        const timeout = 30000; // 30 second timeout
        while ((await deleteButtons.count()) >= currentCount) {
          if (Date.now() - startTime > timeout) {
            throw new Error(
              `Timeout waiting for API key to be deleted. Expected count to be less than ${currentCount}`
            );
          }
          await this.page.waitForTimeout(100);
        }
      }
    }
  }

  /**
   * Bulk delete all API keys using the select all checkbox
   */
  async bulkDeleteApiKeys() {
    const hasApiKeysToDelete = await this.checkboxSelectAll.isVisible().catch(() => false);

    if (hasApiKeysToDelete) {
      await this.checkboxSelectAll.click();
      await this.bulkInvalidateActionButton.click();
      await this.confirmModalConfirmButton.click();
    }
  }

  /**
   * Click on an existing API key row to open the flyout
   */
  async clickExistingApiKeyToOpenFlyout(apiKeyName: string) {
    await this.page.testSubj.locator(`apiKeyRowName-${apiKeyName}`).click();
  }

  /**
   * Ensure that an API key exists (will fail if not found)
   */
  async ensureApiKeyExists(apiKeyName: string) {
    await this.page.testSubj.locator(`apiKeyRowName-${apiKeyName}`).waitFor({ state: 'visible' });
  }

  /**
   * Check if an API key exists
   */
  async doesApiKeyExist(apiKeyName: string) {
    return await this.page.testSubj
      .locator(`apiKeyRowName-${apiKeyName}`)
      .isVisible()
      .catch(() => false);
  }

  /**
   * Get the metadata switch element
   */
  async getMetadataSwitch() {
    return this.apiKeysMetadataSwitch;
  }

  /**
   * Get the code editor value by index (0-based)
   */
  async getCodeEditorValueByIndex(index: number) {
    // Monaco editor interaction - we need to get the text content from the editor
    const editors = this.page.locator('.monaco-editor');
    const editor = editors.nth(index);
    await editor.waitFor({ state: 'visible' });

    // Get the text from the editor's model
    const textContent = await editor.locator('.view-lines').innerText();
    return textContent;
  }

  /**
   * Set the code editor value by index (0-based)
   */
  async setCodeEditorValueByIndex(index: number, data: string) {
    // Monaco editor interaction - we need to set the value
    const editors = this.page.locator('.monaco-editor');
    const editor = editors.nth(index);
    await editor.waitFor({ state: 'visible' });

    // Focus the editor and select all, then type the new value
    await editor.click();
    await this.page.waitForTimeout(100);
    // Use keyboard shortcut to select all content (Cmd+A on Mac, Ctrl+A on others)
    await this.page.keyboard.press('ControlOrMeta+A');
    await this.page.keyboard.press('Delete');
    // Type the new value (this will replace the selected content)
    await this.page.keyboard.type(data);
  }

  /**
   * Get the restrict privileges switch element
   */
  async getRestrictPrivilegesSwitch() {
    return this.apiKeysRoleDescriptorsSwitch;
  }

  /**
   * Get the flyout title text
   */
  async getFlyoutTitleText() {
    const header = this.page.locator('.euiFlyoutHeader');
    return await header.innerText();
  }

  /**
   * Get the API key status text from the flyout
   */
  async getFlyoutApiKeyStatus() {
    return await this.apiKeyStatus.innerText();
  }

  /**
   * Get the API key update success toast
   */
  async getApiKeyUpdateSuccessToast() {
    await this.updateApiKeySuccessToast.waitFor({ state: 'visible' });
    return this.updateApiKeySuccessToast;
  }

  /**
   * Click on expiry filter buttons (active or expired)
   */
  async clickExpiryFilters(type: 'active' | 'expired') {
    const button = type === 'active' ? this.activeFilterButton : this.expiredFilterButton;
    await button.click();
  }

  /**
   * Click on type filter buttons (personal, managed, or cross_cluster)
   */
  async clickTypeFilters(type: 'personal' | 'managed' | 'cross_cluster') {
    const buttonMap = {
      personal: this.personalFilterButton,
      managed: this.managedFilterButton,
      cross_cluster: this.crossClusterFilterButton,
    };

    await buttonMap[type].click();
  }

  /**
   * Click the username dropdown filter button
   */
  async clickUserNameDropdown() {
    await this.ownerFilterButton.click();
  }

  /**
   * Set the search bar value
   */
  async setSearchBarValue(query: string) {
    await this.apiKeysSearchBar.clear();
    await this.apiKeysSearchBar.fill(query);
  }
}
