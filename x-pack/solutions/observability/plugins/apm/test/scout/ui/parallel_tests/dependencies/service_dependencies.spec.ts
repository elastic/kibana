/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';

const DEPENDENCY_NAME = 'postgresql';

// FLAKY: https://github.com/elastic/kibana/issues/247347
test.describe.skip('Service Dependencies Tab', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('Is accessible from the default tab', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await test.step('land on service details page', async () => {
      await serviceDetailsPage.goToPage();
    });

    await test.step('navigate to dependencies tab', async () => {
      await expect(serviceDetailsPage.dependenciesTab.getTab()).toBeVisible();
      await serviceDetailsPage.dependenciesTab.clickTab();
    });

    await test.step('land on dependencies tab', async () => {
      const url = new URL(page.url());
      expect(url.pathname).toContain(`/dependencies`);
      await expect(serviceDetailsPage.dependenciesTab.getTab()).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  test('Renders expected content', async ({ pageObjects: { serviceDetailsPage } }) => {
    await test.step('land on dependencies tab', async () => {
      await serviceDetailsPage.dependenciesTab.goToTab();
    });

    await test.step('renders dependencies content', async () => {
      await expect(serviceDetailsPage.dependenciesTab.dependenciesBreakdownChart).toBeVisible();
      await expect(serviceDetailsPage.dependenciesTab.dependenciesTable).toBeVisible();
      await expect(
        serviceDetailsPage.dependenciesTab.getDependencyInDependenciesTable(DEPENDENCY_NAME)
      ).toBeVisible();
    });
  });

  test('Links to dependency overview when clicking on a dependency in dependencies table', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await test.step('land on dependencies tab', async () => {
      await serviceDetailsPage.dependenciesTab.goToTab();
    });

    await test.step('click on a dependency in dependencies table', async () => {
      await serviceDetailsPage.dependenciesTab.clickDependencyInDependenciesTable(DEPENDENCY_NAME);
    });

    await test.step('land on the dependency service overview page', async () => {
      const url = new URL(page.url());
      expect(url.pathname).toContain('/dependencies/overview');
      expect(url.searchParams.get('dependencyName')).toBe(DEPENDENCY_NAME);
    });
  });

  test('Has no detectable a11y violations on load', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await test.step('land on dependencies tab', async () => {
      await serviceDetailsPage.dependenciesTab.goToTab();
    });

    await test.step('check a11y', async () => {
      const { violations } = await page.checkA11y({ include: ['main'] });
      expect(violations).toHaveLength(0);
    });
  });
});
