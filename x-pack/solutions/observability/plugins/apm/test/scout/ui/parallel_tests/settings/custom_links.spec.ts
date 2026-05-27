/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

test.describe(
  'Custom links',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
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

      // Create a link with unique name to avoid conflicts (using UUID for guaranteed uniqueness)
      const uniqueLabel = `test-link-${randomUUID()}`;
      await customLinksPage.fillLabel(uniqueLabel);
      await customLinksPage.fillUrl('https://example.com');

      await expect(customLinksPage.saveButton).toBeEnabled();
      await customLinksPage.clickSave();

      await expect(page).toHaveURL(/.*custom-links$/);
      // Wait for the custom link row to be visible in the table (with extended timeout for slow loading)
      await expect(customLinksPage.getCustomLinkRow(uniqueLabel)).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });

      await test.step('shows create button', async () => {
        await customLinksPage.goto();
        const createButton = await customLinksPage.getCreateCustomLinkButton();
        await expect(createButton).toBeEnabled();
      });

      await test.step('deletes custom link', async () => {
        // First create a unique custom link
        await customLinksPage.goto();
        await customLinksPage.clickCreateCustomLink();

        const uniqueDeleteLabel = `delete-test-${randomUUID()}`;
        await customLinksPage.fillLabel(uniqueDeleteLabel);
        await customLinksPage.fillUrl('https://example.com/delete-test');
        await customLinksPage.clickSave();

        // Verify we're back on the main page and our link row appears in the table (with extended timeout for slow loading)
        await expect(page).toHaveURL(/.*custom-links$/);
        await expect(customLinksPage.getCustomLinkRow(uniqueDeleteLabel)).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });

        // Then delete the specific link we created
        await customLinksPage.clickEditCustomLinkForRow(uniqueDeleteLabel);
        await customLinksPage.clickDelete();

        // Verify deletion - the specific link row should no longer be present
        await expect(page).toHaveURL(/.*custom-links$/);
        await expect(customLinksPage.getCustomLinkRow(uniqueDeleteLabel)).toBeHidden({
          timeout: EXTENDED_TIMEOUT,
        });

        // Verify the previously created link row is still present
        await expect(customLinksPage.getCustomLinkRow(uniqueLabel)).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });
    });
  }
);
