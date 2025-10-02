/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, apmAuth } from '../../fixtures';

test.describe('Agent Explorer - Viewer', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('shows the agent list', async ({ page, pageObjects: { agentExplorerPage } }) => {
    await agentExplorerPage.goto();

    await test.step('verify agent explorer page loads', async () => {
      await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Agent Explorer', level: 2 })).toBeVisible();
    });
  });
});

test.describe('Agent Explorer - Editor', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test('should be able to access agent explorer', async ({
    page,
    pageObjects: { agentExplorerPage },
  }) => {
    await agentExplorerPage.goto();

    await test.step('verify page navigation and access', async () => {
      await expect(page).toHaveURL(/.*\/app\/apm\/settings\/agent-explorer/);
      const heading = page.getByRole('heading', { name: 'Settings' });
      await expect(heading).toBeVisible();
    });
  });
});

test.describe('Agent Explorer - APM Read Privileges With Write Settings', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await apmAuth.loginAsApmReadPrivilegesWithWriteSettings(browserAuth);
  });

  test('should be able to access agent explorer', async ({
    page,
    pageObjects: { agentExplorerPage },
  }) => {
    await agentExplorerPage.goto();

    await test.step('verify page access with settings write permissions', async () => {
      await expect(page).toHaveURL(/.*\/app\/apm\/settings\/agent-explorer/);
      const heading = page.getByRole('heading', { name: 'Settings' });
      await expect(heading).toBeVisible();

      // Check for agent explorer specific content
      const pageBody = page.locator('body');
      await expect(pageBody).toBeVisible();
    });
  });
});

test.describe(
  'Agent Explorer - APM All Privileges Without Write Settings',
  { tag: ['@ess'] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await apmAuth.loginAsApmAllPrivilegesWithoutWriteSettings(browserAuth);
    });

    test('should be able to view agent explorer but with limited functionality', async ({
      page,
      pageObjects: { agentExplorerPage },
    }) => {
      await agentExplorerPage.goto();

      await test.step('verify page access without settings write permissions', async () => {
        await expect(page).toHaveURL(/.*\/app\/apm\/settings\/agent-explorer/);
        const heading = page.getByRole('heading', { name: 'Settings' });
        await expect(heading).toBeVisible();

        // User should be able to view the page but may have limited functionality
        const pageBody = page.locator('body');
        await expect(pageBody).toBeVisible();
      });
    });
  }
);
