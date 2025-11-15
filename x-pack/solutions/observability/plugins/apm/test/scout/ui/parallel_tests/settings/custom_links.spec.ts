/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';

test.describe('Custom links', { tag: ['@ess', '@svlOblt'] }, () => {
  test('Viewer should show disabled create button and no edit button', async ({
    pageObjects: { customLinksPage },
    browserAuth,
  }) => {
    await browserAuth.loginAsViewer();
    await customLinksPage.goto();

    const createButton = await customLinksPage.getCreateCustomLinkButton();
    await expect(createButton).toBeDisabled();

    const editButton = await customLinksPage.getEditCustomLinkButton();
    await expect(editButton).toBeHidden();
  });

  test('Privileged User should be able to create custom link and delete the created custom link', async ({
    page,
    pageObjects: { customLinksPage },
    browserAuth,
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    await customLinksPage.goto();

    await customLinksPage.clickCreateCustomLink();
    await expect(page.getByRole('heading', { name: 'Create link', level: 2 })).toBeVisible();
    await expect(customLinksPage.saveButton).toBeDisabled();

    // Create a link with unique name to avoid conflicts
    const uniqueLabel = `test-link-${Date.now()}`;
    await customLinksPage.fillLabel(uniqueLabel);
    await customLinksPage.fillUrl('https://example.com');

    await expect(customLinksPage.saveButton).toBeEnabled();
    await customLinksPage.clickSave();

    await expect(page).toHaveURL(/.*custom-links$/);
    // Check that our unique link appears in the table (if table exists) or in the page content
    await expect(page.locator('body')).toContainText(uniqueLabel);

    await test.step('shows create button', async () => {
      await customLinksPage.goto();
      const createButton = await customLinksPage.getCreateCustomLinkButton();
      await expect(createButton).toBeEnabled();
    });

    await test.step('deletes custom link', async () => {
      // First create a unique custom link
      await customLinksPage.goto();
      await customLinksPage.clickCreateCustomLink();

      const uniqueDeleteLabel = `delete-test-${Date.now()}`;
      await customLinksPage.fillLabel(uniqueDeleteLabel);
      await customLinksPage.fillUrl('https://example.com/delete-test');
      await customLinksPage.clickSave();

      // Verify we're back on the main page and our link appears
      await expect(page).toHaveURL(/.*custom-links$/);
      await expect(page.locator('body')).toContainText(uniqueDeleteLabel);

      // Then delete the specific link we created
      await customLinksPage.clickEditCustomLinkForRow(uniqueDeleteLabel);
      await customLinksPage.clickDelete();

      // Verify deletion - the specific link should no longer be present
      await expect(page).toHaveURL(/.*custom-links$/);
      await expect(page.locator('body')).not.toContainText(uniqueDeleteLabel);

      // Verify the previously created link is still present
      await expect(page.locator('body')).toContainText(uniqueLabel);
    });
  });
});
