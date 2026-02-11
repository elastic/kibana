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
  'Storage Explorer - Viewer (No Permissions)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('displays permission denied message', async ({
      page,
      pageObjects: { storageExplorerPage },
    }) => {
      await storageExplorerPage.goto();
      await expect(storageExplorerPage.pageTitle).toBeVisible();

      await test.step('verify permission denied is shown', async () => {
        await expect(page.getByText('You need permission')).toBeVisible();
      });
    });
  }
);
