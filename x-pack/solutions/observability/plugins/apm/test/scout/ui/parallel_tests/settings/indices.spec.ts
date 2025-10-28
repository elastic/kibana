/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';

test.describe('Indices', { tag: ['@ess'] }, () => {
  test('Viewer should not be able to modify settings', async ({
    page,
    pageObjects: { indicesPage },
    browserAuth,
  }) => {
    await browserAuth.loginAsViewer();
    await indicesPage.goto();

    const errorInput = await indicesPage.getErrorIndexInput();
    await expect(errorInput).toBeDisabled();

    const applyButton = await indicesPage.getApplyChangesButton();
    await expect(applyButton).toBeDisabled();
  });

  test('Privileged user should be able to modify settings', async ({
    browserAuth,
    page,
    pageObjects: { indicesPage },
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    await indicesPage.goto();

    const newErrorIndex = 'logs-*';
    const errorInput = await indicesPage.getErrorIndexInput();
    await expect(errorInput).toBeEnabled();

    await indicesPage.setErrorIndex(newErrorIndex);

    const applyButton = await indicesPage.getApplyChangesButton();
    await expect(applyButton).toBeEnabled();

    await indicesPage.clickApplyChanges();
    await page.waitForLoadingIndicatorHidden();

    await expect(await indicesPage.getErrorIndexInput()).toHaveValue(newErrorIndex);
  });
});
