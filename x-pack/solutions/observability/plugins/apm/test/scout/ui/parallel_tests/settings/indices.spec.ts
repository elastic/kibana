/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { waitForApmSettingsHeaderLink } from '../../fixtures/page_helpers';

test.describe('Indices', { tag: tags.stateful.classic }, () => {
  test('Viewer should not be able to modify settings', async ({
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
    await waitForApmSettingsHeaderLink(page);

    await expect(await indicesPage.getErrorIndexInput()).toHaveValue(newErrorIndex);
  });
});
