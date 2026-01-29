/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';

const DEPENDENCY_NAME = 'postgresql';

test.describe('Service Dependencies Tab', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.dependenciesInventoryPage.goToPage();
  });

  test('Renders expected content', async ({ pageObjects: { dependenciesInventoryPage } }) => {
    await expect(dependenciesInventoryPage.header).toBeVisible();
    await expect(dependenciesInventoryPage.dependenciesTable).toBeVisible();
    await expect(
      dependenciesInventoryPage.getDependencyInDependenciesTable(DEPENDENCY_NAME)
    ).toBeVisible();
  });

  test('Links to dependency overview when clicking on a dependency in dependencies table', async ({
    page,
    pageObjects: { dependenciesInventoryPage },
  }) => {
    await dependenciesInventoryPage.clickDependencyInDependenciesTable(DEPENDENCY_NAME);

    const url = new URL(page.url());
    expect(url.pathname).toContain(`/dependencies/overview`);
    expect(url.searchParams.get('dependencyName')).toBe(DEPENDENCY_NAME);
  });

  test('Has no detectable a11y violations on load', async ({ page }) => {
    const { violations } = await page.checkA11y({ include: ['main'] });
    expect(violations).toHaveLength(0);
  });
});
