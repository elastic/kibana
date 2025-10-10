/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, apmAuth } from '../../fixtures';

test.describe('Agent Keys - Viewer', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('shows missing privileges message', async ({ page, pageObjects: { agentKeysPage } }) => {
    await agentKeysPage.goto();
    await expect(page.getByText('You need permission to manage API keys')).toBeVisible();
  });
});

test.describe('Agent Keys - APM All Privileges Without Write Settings', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await apmAuth.loginAsApmAllPrivilegesWithoutWriteSettings(browserAuth);
  });

  test('should not be able to modify settings', async ({ pageObjects: { agentKeysPage } }) => {
    await agentKeysPage.goto();

    const button = agentKeysPage.getCreateButtonLocator();
    await button.waitFor({ timeout: 5000 });
    await expect(button).toBeDisabled();
  });
});

test.describe('Agent Keys - Admin User', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('should be able to modify settings', async ({ pageObjects: { agentKeysPage } }) => {
    await agentKeysPage.goto();
    const button = agentKeysPage.getCreateButtonLocator();
    await expect(button).toBeEnabled();

    await test.step('Create and delete agent key', async () => {
      await agentKeysPage.createAndDeleteKey('apm-admin-key-test');
    });
  });
});
