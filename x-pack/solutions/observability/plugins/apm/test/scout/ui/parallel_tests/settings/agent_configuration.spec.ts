/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';

test.describe('Agent Configuration', { tag: ['@ess'] }, () => {
  test('Viewer should not be able to modify settings', async ({
    pageObjects: { agentConfigurationsPage },
    browserAuth,
  }) => {
    await browserAuth.loginAsViewer();
    await agentConfigurationsPage.goto();
    const createButton = await agentConfigurationsPage.getCreateConfigurationButton();
    await expect(createButton).toBeDisabled();
  });

  test('APM All Privileges Without Write Settings should not be able to modify settings', async ({
    pageObjects: { agentConfigurationsPage },
    browserAuth,
  }) => {
    await browserAuth.loginAsApmAllPrivilegesWithoutWriteSettings();
    await agentConfigurationsPage.goto();
    const createButton = await agentConfigurationsPage.getCreateConfigurationButton();
    await expect(createButton).toBeDisabled();
  });

  test('Privileged user should be able to configure, create and delete an agent configuration with all services and production environment', async ({
    page,
    pageObjects: { agentConfigurationsPage },
    browserAuth,
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    await agentConfigurationsPage.goto();
    const createButton = await agentConfigurationsPage.getCreateConfigurationButton();
    await expect(createButton).toBeEnabled();

    await test.step('create configuration workflow', async () => {
      await agentConfigurationsPage.clickCreateConfiguration();

      await agentConfigurationsPage.selectServiceFromDropdown('All');
      await agentConfigurationsPage.selectEnvironment('production ');

      await agentConfigurationsPage.clickNextStep();
      await expect(page.getByText('Create configuration')).toBeVisible();
    });

    await test.step('verify environment persistence on edit', async () => {
      await agentConfigurationsPage.clickEdit();
      const environmentInput = page.testSubj.locator('serviceEnvironmentComboBox').locator('input');
      await environmentInput.isVisible();
      // Environment should persist as 'production ' since that's what we selected
      await expect(environmentInput).toHaveValue('production ');
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
      await agentConfigurationsPage.checkConfigurationExists('All', 'production ');

      // Delete the configuration
      await agentConfigurationsPage.clickDeleteConfiguration();
      await expect(page.getByText('No configurations found')).toBeVisible();
    });
  });
});
