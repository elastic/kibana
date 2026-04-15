/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';

test.describe('Settings - Serverless', { tag: tags.serverless.observability.complete }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test('Privileged User: The indices settings page is not available in serverless', async ({
    page,
    pageObjects: { indicesPage },
  }) => {
    await indicesPage.goto();

    await expect(page.getByRole('tab').locator('span').getByText('Indices')).toBeHidden();
  });

  test('Viewer: The agent configuration settings page is not available in serverless', async ({
    pageObjects: { agentConfigurationsPage },
    page,
    browserAuth,
  }) => {
    await browserAuth.loginAsViewer();
    await agentConfigurationsPage.goto();
    await expect(
      page.getByRole('tab').locator('span').getByText('Agent Configuration')
    ).toBeHidden();
  });

  test('Privileged User: The agent configuration settings page is not available in serverless', async ({
    pageObjects: { agentConfigurationsPage },
    page,
    browserAuth,
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    await agentConfigurationsPage.goto();
    await expect(
      page.getByRole('tab').locator('span').getByText('Agent Configuration')
    ).toBeHidden();
  });
});
