/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';

const DEPENDENCY_NAME = 'postgresql';

test.describe('Service Dependencies Tab', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.dependenciesInventoryPage.gotoPage({
      start: testData.OPBEANS_START_DATE,
      end: testData.OPBEANS_END_DATE,
    });
  });

  // Assertions are done within the page object
  // eslint-disable-next-line playwright/expect-expect
  test('Renders expected content', async ({ pageObjects: { dependenciesInventoryPage } }) => {
    await dependenciesInventoryPage.expectPageHeaderVisible();
    await dependenciesInventoryPage.expectDependenciesTableVisible();
    await dependenciesInventoryPage.expectDependencyInDependenciesTable(DEPENDENCY_NAME);
  });

  test('Links to dependency overview when clicking on a dependency in dependencies table', async ({
    page,
    pageObjects: { dependenciesInventoryPage },
  }) => {
    await dependenciesInventoryPage.clickDependencyInDependenciesTable(DEPENDENCY_NAME);

    const url = page.url();
    expect(url).toContain(`/dependencies/overview`);
    expect(url).toContain(`dependencyName=${DEPENDENCY_NAME}`);
  });

  test('Has no detectable a11y violations on load', async ({ page }) => {
    const { violations } = await page.checkA11y({ include: ['main'] });
    expect(violations).toHaveLength(0);
  });
});
