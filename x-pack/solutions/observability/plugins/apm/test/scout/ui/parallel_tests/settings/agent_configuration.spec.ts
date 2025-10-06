/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, apmAuth } from '../../fixtures';

test.describe('Agent Configuration - Viewer', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('shows create button as disabled', async ({ pageObjects: { agentConfigurationsPage } }) => {
    await agentConfigurationsPage.goto();
    const createButton = await agentConfigurationsPage.getCreateConfigurationButton();
    await expect(createButton).toBeDisabled();
  });
});

test.describe(
  'Agent Configuration - APM All Privileges Without Write Settings',
  { tag: ['@ess'] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await apmAuth.loginAsApmAllPrivilegesWithoutWriteSettings(browserAuth);
    });

    test('shows create button as disabled', async ({
      pageObjects: { agentConfigurationsPage },
    }) => {
      await agentConfigurationsPage.goto();
      const createButton = await agentConfigurationsPage.getCreateConfigurationButton();
      await expect(createButton).toBeDisabled();
    });
  }
);

test.describe('Agent Configuration - Privileged User', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test('configures, creates and deletes an agent configuration with all services and production environment', async ({
    page,
    pageObjects: { agentConfigurationsPage },
  }) => {
    await agentConfigurationsPage.goto();
    const createButton = await agentConfigurationsPage.getCreateConfigurationButton();
    await expect(createButton).toBeEnabled();

    await test.step('create configuration workflow', async () => {
      await agentConfigurationsPage.clickCreateConfiguration();

      await agentConfigurationsPage.selectServiceFromDropdown('All');
      await agentConfigurationsPage.selectEnvironment('production');

      await agentConfigurationsPage.clickNextStep();
      await expect(page.getByText('Create configuration')).toBeVisible();
    });

    await test.step('verify environment persistence on edit', async () => {
      await agentConfigurationsPage.clickEdit();
      const environmentInput = page.testSubj.locator('serviceEnvironmentComboBox').locator('input');
      await environmentInput.isVisible();
      // Environment should persist (either 'production' or 'All' depending on what was selected)
      await expect(environmentInput).not.toHaveValue('');
      await agentConfigurationsPage.clickNextStep();
    });

    await test.step('configure next transaction settings and save', async () => {
      // Configure a setting to enable save
      await agentConfigurationsPage.selectSettingValue('transaction_max_spans', '600');
      await agentConfigurationsPage.selectSettingValue('transaction_sample_rate', '0.5');
      await agentConfigurationsPage.clickSaveConfiguration();
    });

    await test.step('verify configuration created and removed', async () => {
      await expect(page).toHaveURL(/.*apm\/settings\/agent-configuration/);
      await expect(page.getByText('Configurations')).toBeVisible();
      await agentConfigurationsPage.checkConfigurationExists('All', 'production');

      // Delete the configuration
      await agentConfigurationsPage.clickDeleteConfiguration();
      await expect(page.getByText('No configurations found')).toBeVisible();
    });
  });
});

test.describe('Agent Configuration - Viewer', { tag: ['@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('The agent configuration settings page is not available in serverless', async ({
    pageObjects: { agentConfigurationsPage },
    page,
  }) => {
    await agentConfigurationsPage.goto();
    await expect(
      page.getByRole('tab').locator('span').getByText('Agent Configuration')
    ).toBeHidden();
  });
});
