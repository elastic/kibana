/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';

test.describe('General Settings - Viewer', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('should not be able to modify settings', async ({
    page,
    pageObjects: { generalSettingsPage },
  }) => {
    await generalSettingsPage.goto();

    const inspectButton = await generalSettingsPage.getInspectEsQueriesButton();
    await expect(inspectButton).toBeDisabled();

    const saveButton = await generalSettingsPage.getSaveChangesButton();
    await expect(saveButton).toBeHidden();
  });
});

test.describe('General Settings - Privileged User', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test('should be able to modify settings', async ({
    page,
    pageObjects: { generalSettingsPage },
  }) => {
    await generalSettingsPage.goto();

    const inspectButton = await generalSettingsPage.getInspectEsQueriesButton();
    await expect(inspectButton).toBeEnabled();

    await generalSettingsPage.clickInspectEsQueriesButton();

    // Set up network interception for the save request
    const saveRequestPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/internal/kibana/settings') &&
        response.request().method() === 'POST'
    );

    await generalSettingsPage.clickSaveChanges();

    const saveResponse = await saveRequestPromise;
    expect(saveResponse.status()).toBe(200);
  });
});
