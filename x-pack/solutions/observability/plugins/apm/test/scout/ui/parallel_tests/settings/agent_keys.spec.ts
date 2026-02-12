/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';

test.describe(
  'Agent Keys',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test('Viewer should see missing privileges message', async ({
      page,
      pageObjects: { agentKeysPage },
      browserAuth,
    }) => {
      await browserAuth.loginAsViewer();
      await agentKeysPage.goto();
      await expect(page.getByText('You need permission to manage API keys')).toBeVisible();
    });

    test('Admin User should be able to modify settings', async ({
      pageObjects: { agentKeysPage },
      browserAuth,
    }) => {
      await browserAuth.loginAsAdmin();
      await agentKeysPage.goto();
      const button = agentKeysPage.getCreateButtonLocator();
      await expect(button).toBeEnabled();

      await test.step('Create and delete agent key', async () => {
        await agentKeysPage.createAndDeleteKey('apm-admin-key-test');
      });
    });
  }
);
