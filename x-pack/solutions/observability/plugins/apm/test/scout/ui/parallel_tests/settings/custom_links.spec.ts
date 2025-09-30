/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';

test.describe('Custom links - Viewer', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('shows disabled create button and no edit button', async ({
    pageObjects: { customLinksPage },
  }) => {
    await customLinksPage.goto();

    const createButton = await customLinksPage.getCreateCustomLinkButton();
    await expect(createButton).toBeDisabled();

    const editButton = await customLinksPage.getEditCustomLinkButton();
    await expect(editButton).toBeHidden();
  });
});

test.describe('Custom links - Privileged User', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test('shows create button functionality', async ({ page, pageObjects: { customLinksPage } }) => {
    await customLinksPage.goto();

    // Verify the create button is present and enabled
    const createButton = await customLinksPage.getCreateCustomLinkButton();
    await expect(createButton).toBeEnabled();

    // Test the create button functionality
    await createButton.click();
    await expect(page.getByText('Create link')).toBeVisible();
  });

  test('creates custom link', async ({ page, pageObjects: { customLinksPage } }) => {
    await customLinksPage.goto();

    await customLinksPage.clickCreateCustomLink();

    await expect(page.getByText('Create link')).toBeVisible();
    await expect(page.getByText('Save')).toBeDisabled();

    // Create a link with unique name to avoid conflicts
    const uniqueLabel = `test-link-${Date.now()}`;
    await customLinksPage.fillLabel(uniqueLabel);
    await customLinksPage.fillUrl('https://example.com');

    await expect(page.getByText('Save')).toBeEnabled();
    await customLinksPage.clickSave();

    // Verify we're back on the main page and our link appears
    await expect(page).toHaveURL(/.*custom-links$/);
    // Check that our unique link appears in the table (if table exists) or in the page content
    await expect(page.locator('body')).toContainText(uniqueLabel);
  });

  test('shows create button', async ({ page, pageObjects: { customLinksPage } }) => {
    await customLinksPage.goto();

    const createButton = await customLinksPage.getCreateCustomLinkButton();
    await expect(createButton).toBeEnabled();
  });

  test('deletes custom link', async ({ page, pageObjects: { customLinksPage } }) => {
    // First create a unique custom link
    await customLinksPage.goto();
    await customLinksPage.clickCreateCustomLink();

    const uniqueLabel = `delete-test-${Date.now()}`;
    await customLinksPage.fillLabel(uniqueLabel);
    await customLinksPage.fillUrl('https://delete-test.com');
    await customLinksPage.clickSave();

    // Verify we're back on the main page and our link appears
    await expect(page).toHaveURL(/.*custom-links$/);
    await expect(page.locator('body')).toContainText(uniqueLabel);

    // Then delete the specific link we created
    await customLinksPage.clickEditCustomLinkForRow(uniqueLabel);
    await customLinksPage.clickDelete();

    // Verify deletion - the specific link we created should no longer be present
    await expect(page).toHaveURL(/.*custom-links$/);
    await expect(page.locator('body')).not.toContainText(uniqueLabel);
  });
});
