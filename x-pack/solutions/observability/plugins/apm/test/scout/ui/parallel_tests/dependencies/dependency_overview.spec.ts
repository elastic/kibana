/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

test.describe('Dependency Overview Tab', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test("Is the default tab when navigating to a dependency's details page", async ({
    page,
    pageObjects: { dependencyDetailsPage },
  }) => {
    await test.step('land on dependency details page', async () => {
      await dependencyDetailsPage.goToPage();
    });

    await test.step('verify overview tab is selected', async () => {
      await expect(dependencyDetailsPage.overviewTab.tab).toBeVisible();
      await expect(dependencyDetailsPage.overviewTab.tab).toHaveAttribute('aria-selected', 'true');

      const url = new URL(page.url());
      expect(url.pathname).toContain(`/dependencies/overview`);
    });
  });

  test('Renders expected content', async ({ pageObjects: { dependencyDetailsPage } }) => {
    await test.step('land on overview tab', async () => {
      await dependencyDetailsPage.overviewTab.goToTab();
    });

    await test.step('renders overview content', async () => {
      await expect(dependencyDetailsPage.overviewTab.latencyChart).toBeVisible();
      await expect(dependencyDetailsPage.overviewTab.throughputChart).toBeVisible();
      await expect(dependencyDetailsPage.overviewTab.failedTransactionRateChart).toBeVisible();
      await expect(dependencyDetailsPage.overviewTab.upstreamServicesTable).toBeVisible();
      await expect(
        dependencyDetailsPage.overviewTab.upstreamServicesTable.getByRole('heading', {
          name: 'Upstream services',
        })
      ).toBeVisible();
      await expect(
        dependencyDetailsPage.overviewTab.getServiceInUpstreamServicesTable(
          testData.SERVICE_OPBEANS_JAVA
        )
      ).toBeVisible();
    });
  });

  test('Links to service overview when clicking on a service in upstream services table', async ({
    page,
    pageObjects: { dependencyDetailsPage },
  }) => {
    await test.step('land on overview tab', async () => {
      await dependencyDetailsPage.overviewTab.goToTab();
    });

    await test.step('click on a service in upstream services table', async () => {
      await dependencyDetailsPage.overviewTab.clickServiceInUpstreamServicesTable(
        testData.SERVICE_OPBEANS_JAVA
      );
    });

    await test.step('lands on the service overview page', async () => {
      const url = new URL(page.url());
      expect(url.pathname).toContain(`/services/${testData.SERVICE_OPBEANS_JAVA}/overview`);
    });
  });

  test('Has no detectable a11y violations on load', async ({
    page,
    pageObjects: { dependencyDetailsPage },
  }) => {
    await test.step('land on dependencies tab', async () => {
      await dependencyDetailsPage.overviewTab.goToTab();
    });

    await test.step('check a11y', async () => {
      const { violations } = await page.checkA11y({ include: ['main'] });
      expect(violations).toHaveLength(0);
    });
  });
});
