/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';

test.describe('Indices - Viewer', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('should not be able to modify settings', async ({ page, pageObjects: { indicesPage } }) => {
    await indicesPage.goto();

    const errorInput = await indicesPage.getErrorIndexInput();
    await expect(errorInput).toBeDisabled();

    const applyButton = await indicesPage.getApplyChangesButton();
    await expect(applyButton).toBeDisabled();
  });
});

test.describe('Indices - Privileged User', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test('should be able to modify settings', async ({ page, pageObjects: { indicesPage } }) => {
    await indicesPage.goto();

    const newErrorIndex = 'logs-*';
    const errorInput = await indicesPage.getErrorIndexInput();
    await expect(errorInput).toBeEnabled();

    await indicesPage.setErrorIndex(newErrorIndex);

    const applyButton = await indicesPage.getApplyChangesButton();
    await expect(applyButton).toBeEnabled();

    // Set up network interception for the save request
    const saveRequestPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/internal/apm-sources/settings/apm-indices/save') &&
        response.request().method() === 'POST'
    );

    await indicesPage.clickApplyChanges();

    const saveResponse = await saveRequestPromise;
    expect(saveResponse.status()).toBe(200);
  });
});
test.describe('Indices - Privileged User', { tag: ['@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test('The indices settings page is not available in serverless', async ({
    page,
    pageObjects: { indicesPage },
  }) => {
    await indicesPage.goto();

    await expect(page.getByRole('tab').locator('span').getByText('Indices')).toBeHidden();
  });
});
