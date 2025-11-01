/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserAuthFixture } from '@kbn/scout';
import { expect, tags } from '@kbn/scout';
import { test } from '../fixtures';

const testRoles: Record<string, any> = {
  viewer: {
    cluster: ['all'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
        allow_restricted_indices: false,
      },
      {
        names: ['*'],
        privileges: ['monitor', 'read', 'view_index_metadata', 'read_cross_cluster'],
        allow_restricted_indices: true,
      },
    ],
    run_as: ['*'],
  },
};

function loginAsApiKeysAdmin(browserAuth: BrowserAuthFixture): Promise<void> {
  const time = `does-not-exist-${Math.random().toString(36).substring(2, 15)}`;
  return browserAuth.loginWithCustomRole({
    elasticsearch: {
      cluster: ['manage_security', 'manage_api_key'],
    },
    kibana: [
      {
        base: [],
        feature: {
          advancedSettings: ['read'],
        },
        spaces: ['default', time],
      },
    ],
  });
}

function loginAsApiKeysReadOnlyUser(browserAuth: BrowserAuthFixture): Promise<void> {
  const time = `does-not-exist-${Math.random().toString(36).substring(2, 15)}`;

  return browserAuth.loginWithCustomRole({
    elasticsearch: {
      cluster: ['read_security'],
    },
    kibana: [
      {
        base: [],
        feature: {
          advancedSettings: ['read'],
        },
        spaces: ['default', time],
      },
    ],
  });
}

test.describe('Home page', { tag: tags.ESS_ONLY }, () => {
  test.beforeAll(async ({ apiServices }) => {
    // Clean up any existing API keys
    await apiServices.apiKeys.cleanup.deleteAll();
  });

  test('Hides management link if user is not authorized', async ({
    page,
    browserAuth,
    pageObjects,
  }) => {
    // The API Keys test subject should not be visible for editor without proper permissions
    // Login as admin and navigate to API Keys
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.apiKeys.goto();
    const apiKeysSubject = page.testSubj.locator('apiKeys');
    const isVisible = await apiKeysSubject.isVisible();
    expect(isVisible).toBe(false);
  });

  test('Loads the app', async ({ browserAuth, page, pageObjects }) => {
    await loginAsApiKeysAdmin(browserAuth);
    await pageObjects.apiKeys.goto();

    // Verify the create API key link is present
    const createLink = page.getByText('Create API key');
    await expect(createLink).toBeVisible();
  });

  test.describe('creates API key', () => {
    test.beforeEach(async ({ apiServices }) => {
      // Delete any API keys created outside of these tests
      await apiServices.apiKeys.cleanup.deleteAll();
    });

    test('when submitting form, close dialog and displays new api key', async ({
      page,
      pageObjects,
      browserAuth,
    }) => {
      await loginAsApiKeysAdmin(browserAuth);
      await pageObjects.apiKeys.goto();

      const apiKeyName = 'Happy API Key';

      // Click create API key button
      await pageObjects.apiKeys.clickOnPromptCreateApiKey();

      // Verify URL contains create path
      expect(page.url()).toContain('app/management/security/api_keys/create');

      // Verify flyout title
      const flyoutTitle = await pageObjects.apiKeys.getFlyoutTitleText();
      expect(flyoutTitle).toContain('Create API key');

      // Set API key name
      await pageObjects.apiKeys.setApiKeyName(apiKeyName);

      // Click submit
      await pageObjects.apiKeys.clickSubmitButtonOnApiKeyFlyout();

      // Wait for modal to close
      await page.waitForTimeout(1000);

      // Get creation message
      const creationMessage = await pageObjects.apiKeys.getNewApiKeyCreation();

      // Verify URL does not contain flyout path
      expect(page.url()).not.toContain('app/management/security/api_keys/flyout');

      // Verify URL contains api_keys path
      expect(page.url()).toContain('app/management/security/api_keys');

      // Verify modal does not exist
      const modalExists = await pageObjects.apiKeys.isApiKeyModalExists();
      expect(modalExists).toBe(false);

      // Verify creation message
      expect(creationMessage).toBe(`Created API key '${apiKeyName}'`);
    });

    test('with optional expiration, redirects back and displays base64', async ({
      page,
      pageObjects,
      browserAuth,
    }) => {
      await loginAsApiKeysAdmin(browserAuth);
      await pageObjects.apiKeys.goto();

      const apiKeyName = 'Happy expiration API key';

      // Click create API key button
      await pageObjects.apiKeys.clickOnPromptCreateApiKey();

      // Verify URL contains create path
      expect(page.url()).toContain('app/management/security/api_keys/create');

      // Set API key name
      await pageObjects.apiKeys.setApiKeyName(apiKeyName);

      // Toggle custom expiration
      await pageObjects.apiKeys.toggleCustomExpiration();

      // Set expiration to 12 days
      await pageObjects.apiKeys.setApiKeyCustomExpiration('12');

      // Click submit
      await pageObjects.apiKeys.clickSubmitButtonOnApiKeyFlyout();

      // Wait for modal to close
      await page.waitForTimeout(1000);

      // Get creation message
      const creationMessage = await pageObjects.apiKeys.getNewApiKeyCreation();

      // Verify URL does not contain create path
      expect(page.url()).not.toContain('app/management/security/api_keys/create');

      // Verify URL contains api_keys path
      expect(page.url()).toContain('app/management/security/api_keys');

      // Verify modal does not exist
      const modalExists = await pageObjects.apiKeys.isApiKeyModalExists();
      expect(modalExists).toBe(false);

      // Verify creation message
      expect(creationMessage).toBe(`Created API key '${apiKeyName}'`);
    });
  });

  test.describe('Update API key', () => {
    test.beforeAll(async ({ apiServices }) => {
      // Delete any API keys created outside these tests
      await apiServices.apiKeys.cleanup.deleteAll();
    });

    test('should create a new API key, click the name of the new row, fill out and submit form, and display success message', async ({
      page,
      pageObjects,
      browserAuth,
    }) => {
      await loginAsApiKeysAdmin(browserAuth);
      await pageObjects.apiKeys.goto();
      const apiKeyName = 'Happy API Key to Update';

      await pageObjects.apiKeys.clickOnPromptCreateApiKey();
      await pageObjects.apiKeys.setApiKeyName(apiKeyName);
      await pageObjects.apiKeys.clickSubmitButtonOnApiKeyFlyout();
      await pageObjects.apiKeys.ensureApiKeyExists(apiKeyName);

      await pageObjects.apiKeys.clickExistingApiKeyToOpenFlyout(apiKeyName);

      // Wait for submit button to be visible
      await pageObjects.apiKeys.waitForSubmitButtonOnApiKeyFlyoutEnabled();

      // Verify flyout title
      const flyoutTitle = await pageObjects.apiKeys.getFlyoutTitleText();
      expect(flyoutTitle).toContain('Update API key');

      // Verify API key name input is not present (name cannot be changed)
      const namePresent = await pageObjects.apiKeys.isApiKeyNamePresent();
      expect(namePresent).toBe(false);

      // Verify status
      expect(await pageObjects.apiKeys.getFlyoutApiKeyStatus()).toBe('Active');

      // Get metadata switch and verify it is enabled
      const metadataSwitch = await pageObjects.apiKeys.getMetadataSwitch();
      const metadataEnabled = await metadataSwitch.isEnabled();
      expect(metadataEnabled).toBe(true);

      // Get restrict privileges switch and verify it is enabled
      const restrictPrivilegesSwitch = await pageObjects.apiKeys.getRestrictPrivilegesSwitch();
      const restrictPrivilegesEnabled = await restrictPrivilegesSwitch.isEnabled();
      expect(restrictPrivilegesEnabled).toBe(true);

      // Click restrict privileges switch to show code editor
      await restrictPrivilegesSwitch.click();

      // Click metadata switch to show code editor
      await metadataSwitch.click();

      // Get and verify restrict privileges code editor value
      const restrictPrivilegesValue = await pageObjects.apiKeys.getCodeEditorValueByIndex(0);
      expect(restrictPrivilegesValue.trim()).toBe('{}');

      // Get and verify metadata code editor value
      const metadataValue = await pageObjects.apiKeys.getCodeEditorValueByIndex(1);
      expect(metadataValue.trim()).toBe('{}');

      // Set restrict privileges code editor value
      await pageObjects.apiKeys.setCodeEditorValueByIndex(0, JSON.stringify(testRoles));

      // Set metadata code editor value
      await pageObjects.apiKeys.setCodeEditorValueByIndex(1, '{"name":"metadataTest"}');

      // Click submit button
      await pageObjects.apiKeys.clickSubmitButtonOnApiKeyFlyout();

      // Get success toast text
      const toast = await pageObjects.apiKeys.getApiKeyUpdateSuccessToast();
      expect(toast).toContainText(`Updated API key '${apiKeyName}'`);

      // Verify URL contains api_keys path
      expect(page.url()).toContain('app/management/security/api_keys');

      // Verify modal does not exist
      const modalExists = await pageObjects.apiKeys.isApiKeyModalExists();
      expect(modalExists).toBe(false);
    });
  });

  test.describe('Readonly API key', () => {
    test.beforeAll(async ({ apiServices }) => {
      // Delete any API keys created outside these tests
      await apiServices.apiKeys.cleanup.deleteAll();
    });

    test('should see readonly form elements', async ({
      page,
      pageObjects,
      apiServices,
      browserAuth,
    }) => {
      const apiKeyName = 'Happy API Key to View';

      // Create API key with metadata and role descriptors
      const { data: apiKey } = await apiServices.apiKeys.create({
        name: apiKeyName,
        expiration: '1d',
        metadata: { name: 'metadatatest' },
        role_descriptors: testRoles,
      });

      expect(apiKey.id).toBeDefined();

      // Set user roles to read_security_role
      await loginAsApiKeysReadOnlyUser(browserAuth);
      await pageObjects.apiKeys.goto();

      // Click on API key to open flyout
      await pageObjects.apiKeys.clickExistingApiKeyToOpenFlyout(apiKeyName);

      // Verify URL
      expect(page.url()).toContain('app/management/security/api_keys');

      // Verify flyout title
      const flyoutTitle = await pageObjects.apiKeys.getFlyoutTitleText();
      expect(flyoutTitle).toContain('API key details');

      // Verify name input is not present
      const namePresent = await pageObjects.apiKeys.isApiKeyNamePresent();
      expect(namePresent).toBe(false);

      // Verify status
      expect(await pageObjects.apiKeys.getFlyoutApiKeyStatus()).toBe('Expires in a day');

      // Get metadata switch and verify it is disabled
      const metadataSwitch = await pageObjects.apiKeys.getMetadataSwitch();
      const metadataEnabled = await metadataSwitch.isEnabled();
      expect(metadataEnabled).toBe(false);

      // Get restrict privileges switch and verify it is disabled
      const restrictPrivilegesSwitch = await pageObjects.apiKeys.getRestrictPrivilegesSwitch();
      const restrictPrivilegesEnabled = await restrictPrivilegesSwitch.isEnabled();
      expect(restrictPrivilegesEnabled).toBe(false);

      // Click cancel button
      await pageObjects.apiKeys.clickCancelButtonOnApiKeyFlyout();
    });

    test('should show the `API key details` flyout if the expiration date is passed', async ({
      page,
      pageObjects,
      apiServices,
      browserAuth,
    }) => {
      await loginAsApiKeysReadOnlyUser(browserAuth);
      await pageObjects.apiKeys.goto();

      const apiKeyName = 'expired-key';

      // Create API key with very short expiration
      const { data: apiKey } = await apiServices.apiKeys.create({
        name: apiKeyName,
        expiration: '1ms',
      });

      expect(apiKey.id).toBeDefined();

      // Wait a bit to ensure expiration
      await page.reload();

      // Click on API key to open flyout
      await pageObjects.apiKeys.clickExistingApiKeyToOpenFlyout(apiKeyName);

      // Verify URL
      expect(page.url()).toContain('app/management/security/api_keys');

      // Verify flyout title
      const flyoutTitle = await pageObjects.apiKeys.getFlyoutTitleText();
      expect(flyoutTitle).toContain('API key details');

      // Verify name input is not present
      const namePresent = await pageObjects.apiKeys.isApiKeyNamePresent();
      expect(namePresent).toBe(false);

      // Verify status shows expired
      expect(await pageObjects.apiKeys.getFlyoutApiKeyStatus()).toBe('Expired');

      // Get metadata switch and verify it is disabled
      const metadataSwitch = await pageObjects.apiKeys.getMetadataSwitch();
      const metadataEnabled = await metadataSwitch.isEnabled();
      expect(metadataEnabled).toBe(false);

      // Get restrict privileges switch and verify it is disabled
      const restrictPrivilegesSwitch = await pageObjects.apiKeys.getRestrictPrivilegesSwitch();
      const restrictPrivilegesEnabled = await restrictPrivilegesSwitch.isEnabled();
      expect(restrictPrivilegesEnabled).toBe(false);

      // Click cancel button
      await pageObjects.apiKeys.clickCancelButtonOnApiKeyFlyout();
    });

    test('should show the `API key details flyout` if the API key does not belong to the user', async ({
      page,
      pageObjects,
      apiServices,
      browserAuth,
    }) => {
      await loginAsApiKeysReadOnlyUser(browserAuth);
      await pageObjects.apiKeys.goto();
      const apiKeyName = 'other-key';

      // Create API key for different user (elastic)
      const { data: apiKey } = await apiServices.apiKeys.create({
        name: apiKeyName,
      });

      expect(apiKey.id).toBeDefined();

      // Refresh browser
      await page.reload();
      await page.waitForTimeout(1000);

      // Click on API key to open flyout
      await pageObjects.apiKeys.clickExistingApiKeyToOpenFlyout(apiKeyName);

      // Verify URL
      expect(page.url()).toContain('app/management/security/api_keys');

      // Verify flyout title
      const flyoutTitle = await pageObjects.apiKeys.getFlyoutTitleText();
      expect(flyoutTitle).toContain('API key details');

      // Verify name input is not present
      const namePresent = await pageObjects.apiKeys.isApiKeyNamePresent();
      expect(namePresent).toBe(false);

      // Verify status shows active
      expect(await pageObjects.apiKeys.getFlyoutApiKeyStatus()).toBe('Active');

      // Get metadata switch and verify it is disabled
      const metadataSwitch = await pageObjects.apiKeys.getMetadataSwitch();
      const metadataEnabled = await metadataSwitch.isEnabled();
      expect(metadataEnabled).toBe(false);

      // Get restrict privileges switch and verify it is disabled
      const restrictPrivilegesSwitch = await pageObjects.apiKeys.getRestrictPrivilegesSwitch();
      const restrictPrivilegesEnabled = await restrictPrivilegesSwitch.isEnabled();
      expect(restrictPrivilegesEnabled).toBe(false);

      // Click cancel button
      await pageObjects.apiKeys.clickCancelButtonOnApiKeyFlyout();
    });
  });

  test.describe('deletes API key(s)', () => {
    test.beforeEach(async ({ page, pageObjects, browserAuth, apiServices }) => {
      await apiServices.apiKeys.cleanup.deleteAll();
      await loginAsApiKeysAdmin(browserAuth);
      await pageObjects.apiKeys.goto();

      await apiServices.apiKeys.create({
        name: 'api key 1',
      });

      // Create API key
      await page.reload();
      await pageObjects.apiKeys.ensureApiKeyExists('api key 1');
    });

    test('one by one', async ({ page, pageObjects, browserAuth }) => {
      // Delete all API keys one by one
      await pageObjects.apiKeys.ensureApiKeyExists('api key 1');
      await pageObjects.apiKeys.deleteAllApiKeyOneByOne();

      // Verify we're back to the empty prompt
      const promptTitle = await pageObjects.apiKeys.getApiKeysFirstPromptTitle();
      expect(promptTitle).toBe('Create your first API key');
    });

    test('by bulk', async ({ page, pageObjects, browserAuth }) => {
      // Create second API key
      await pageObjects.apiKeys.clickOnTableCreateApiKey();
      await pageObjects.apiKeys.setApiKeyName('api key 2');
      await pageObjects.apiKeys.clickSubmitButtonOnApiKeyFlyout();

      // Ensure both keys exist
      await pageObjects.apiKeys.ensureApiKeyExists('api key 1');
      await pageObjects.apiKeys.ensureApiKeyExists('api key 2');

      // Bulk delete all keys
      await pageObjects.apiKeys.bulkDeleteApiKeys();

      await page.waitForSelector('.euiEmptyPrompt .euiTitle', { state: 'visible' });
      const promptTitle = await pageObjects.apiKeys.getApiKeysFirstPromptTitle();
      expect(promptTitle).toBe('Create your first API key');
    });
  });

  test.describe('querying API keys', () => {
    test.beforeAll(async ({ apiServices, esClient }) => {
      // Clear all existing API keys
      await apiServices.apiKeys.cleanup.deleteAll();

      // Create cross-cluster API key
      await esClient.transport.request({
        method: 'POST',
        path: '/_security/cross_cluster/api_key',
        body: {
          name: 'test_cross_cluster',
          expiration: '1d',
          access: {
            search: [{ names: ['*'] }],
            replication: [{ names: ['*'] }],
          },
        },
      });

      // Create managed API key
      await apiServices.apiKeys.create({
        name: 'my api key',
        expiration: '1d',
        metadata: { managed: true },
      });

      // Create another managed key
      await apiServices.apiKeys.create({
        name: 'Alerting: Managed',
        expiration: '1d',
      });

      // Create API key that will expire quickly
      await apiServices.apiKeys.create({
        name: 'test_api_key',
        expiration: '1s',
      });

      // Wait for the key to expire
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    test.afterAll(async ({ apiServices }) => {
      // Restore defaults and clear API keys
      await apiServices.apiKeys.cleanup.deleteAll();
    });

    test.beforeEach(async ({ page, pageObjects, browserAuth, apiServices }) => {
      // Navigate to API Keys app before each test
      await loginAsApiKeysAdmin(browserAuth);
      await pageObjects.apiKeys.goto();

      const { data: apiKeys } = await apiServices.apiKeys.query({
        query: {
          wildcard: {
            name: 'custom role api key',
          },
        },
      });

      if (apiKeys.apiKeys.length === 0) {
        // Creating with pageObjects because this needs to be owned by the test user, not the default `elastic` user
        await pageObjects.apiKeys.clickOnTableCreateApiKey();
        await pageObjects.apiKeys.setApiKeyName('custom role api key');
        await pageObjects.apiKeys.clickSubmitButtonOnApiKeyFlyout();
        await pageObjects.apiKeys.ensureApiKeyExists('custom role api key');
      }
    });

    test('active/expired filter buttons work as expected', async ({ page, pageObjects }) => {
      // Click active filter
      await pageObjects.apiKeys.clickExpiryFilters('active');
      await page.waitForTimeout(500);

      // Ensure active keys exist
      await pageObjects.apiKeys.ensureApiKeyExists('my api key');
      await pageObjects.apiKeys.ensureApiKeyExists('Alerting: Managed');
      await pageObjects.apiKeys.ensureApiKeyExists('test_cross_cluster');

      // Verify expired key does not exist
      const expiredExists = await pageObjects.apiKeys.doesApiKeyExist('test_api_key');
      expect(expiredExists).toBe(false);

      // Click expired filter
      await pageObjects.apiKeys.clickExpiryFilters('expired');
      await page.waitForTimeout(500);

      // Ensure expired key exists
      await pageObjects.apiKeys.ensureApiKeyExists('test_api_key');

      // Verify active key does not exist
      const activeExists = await pageObjects.apiKeys.doesApiKeyExist('my api key');
      expect(activeExists).toBe(false);

      // Reset filter by clicking expired again
      await pageObjects.apiKeys.clickExpiryFilters('expired');
      await page.waitForTimeout(500);
    });

    test('api key type filter buttons work as expected', async ({ page, pageObjects }) => {
      // Click personal filter
      await pageObjects.apiKeys.clickTypeFilters('personal');
      await page.waitForTimeout(500);

      // Ensure personal key exists
      await pageObjects.apiKeys.ensureApiKeyExists('custom role api key');

      // Click cross_cluster filter
      await pageObjects.apiKeys.clickTypeFilters('cross_cluster');
      await page.waitForTimeout(500);

      // Ensure cross-cluster key exists
      await pageObjects.apiKeys.ensureApiKeyExists('test_cross_cluster');

      // Click managed filter
      await pageObjects.apiKeys.clickTypeFilters('managed');
      await page.waitForTimeout(500);

      // Ensure managed keys exist
      await pageObjects.apiKeys.ensureApiKeyExists('my api key');
      await pageObjects.apiKeys.ensureApiKeyExists('Alerting: Managed');

      // Reset filters by clicking managed again
      await pageObjects.apiKeys.clickTypeFilters('managed');
      await page.waitForTimeout(500);
    });

    test('username filter buttons work as expected', async ({ page, pageObjects, samlAuth }) => {
      // Click username dropdown
      await pageObjects.apiKeys.clickUserNameDropdown();
      await page.waitForTimeout(300);

      // Verify user options exist
      const customUserExists = await page.testSubj.isVisible(
        `userProfileSelectableOption-elastic_${samlAuth.customRoleName}`
      );
      expect(customUserExists).toBe(true);

      const testUserExists = await page.testSubj.isVisible('userProfileSelectableOption-elastic');
      expect(testUserExists).toBe(true);

      // Click custom role option
      await page.testSubj.click(`userProfileSelectableOption-elastic_${samlAuth.customRoleName}`);
      await page.waitForTimeout(500);

      // Ensure custom role API key exists
      await pageObjects.apiKeys.ensureApiKeyExists('custom role api key');

      // Deselect custom role
      await page.testSubj.click(`userProfileSelectableOption-elastic`);
      await page.waitForTimeout(500);

      // Click elastic option
      await page.testSubj.click(`userProfileSelectableOption-elastic_${samlAuth.customRoleName}`);
      await page.waitForTimeout(500);

      // Ensure elastic user keys exist
      await pageObjects.apiKeys.ensureApiKeyExists('my api key');
      await pageObjects.apiKeys.ensureApiKeyExists('Alerting: Managed');
      await pageObjects.apiKeys.ensureApiKeyExists('test_cross_cluster');
    });

    test('search bar works as expected', async ({ page, pageObjects }) => {
      // Search for custom role api key
      await pageObjects.apiKeys.setSearchBarValue('custom role api key');
      await page.waitForTimeout(500);

      // Ensure API key exists
      await pageObjects.apiKeys.ensureApiKeyExists('custom role api key');

      // Search with exact match quotes
      await pageObjects.apiKeys.setSearchBarValue('"custom role api key"');
      await page.waitForTimeout(500);

      // Ensure API key exists
      await pageObjects.apiKeys.ensureApiKeyExists('my api key');

      // Search with partial match
      await pageObjects.apiKeys.setSearchBarValue('"api"');
      await page.waitForTimeout(500);

      // Ensure API key exists
      await pageObjects.apiKeys.ensureApiKeyExists('my api key');
    });
  });
});
