/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';

const SERVICE_NAME = 'opbeans-java';

test.describe('Dependency Overview Tab', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test("Is the default tab when navigating to a dependency's details page", async ({
    page,
    pageObjects: { dependencyDetailsPage },
  }) => {
    await test.step('Land on dependency details page', async () => {
      await dependencyDetailsPage.goToPage();
    });

    await test.step('Verify overview tab is selected', async () => {
      await expect(dependencyDetailsPage.getOverviewTab()).toBeVisible();
      await expect(dependencyDetailsPage.getOverviewTab()).toHaveAttribute('aria-selected', 'true');

      const url = new URL(page.url());
      expect(url.pathname).toContain(`/dependencies/overview`);
    });
  });

  test('Renders expected content', async ({ pageObjects: { dependencyDetailsPage } }) => {
    await test.step('Land on overview tab', async () => {
      await dependencyDetailsPage.goToOverviewTab();
    });

    await test.step('Renders overview content', async () => {
      await expect(dependencyDetailsPage.overviewTabLatencyChart).toBeVisible();
      await expect(dependencyDetailsPage.overviewTabThroughputChart).toBeVisible();
      await expect(dependencyDetailsPage.overviewTabFailedTransactionRateChart).toBeVisible();
      await expect(dependencyDetailsPage.overviewTabUpstreamServicesTable).toBeVisible();
      await expect(
        dependencyDetailsPage.overviewTabUpstreamServicesTable.getByRole('heading', {
          name: 'Upstream services',
        })
      ).toBeVisible();
      await expect(
        dependencyDetailsPage.getServiceInOverviewTabUpstreamServicesTable(SERVICE_NAME)
      ).toBeVisible();
    });
  });

  test('Links to service overview when clicking on a service in upstream services table', async ({
    page,
    pageObjects: { dependencyDetailsPage },
  }) => {
    await test.step('Land on overview tab', async () => {
      await dependencyDetailsPage.goToOverviewTab();
    });

    await test.step('Click on a service in upstream services table', async () => {
      await dependencyDetailsPage.clickServiceInOverviewTabUpstreamServicesTable(SERVICE_NAME);
    });

    await test.step('Lands on the service overview page', async () => {
      const url = new URL(page.url());
      expect(url.pathname).toContain(`/services/${SERVICE_NAME}/overview`);
    });
  });

  test('Has no detectable a11y violations on load', async ({
    page,
    pageObjects: { dependencyDetailsPage },
  }) => {
    await test.step('Land on dependencies tab', async () => {
      await dependencyDetailsPage.goToOverviewTab();
    });

    await test.step('Check a11y', async () => {
      const { violations } = await page.checkA11y({ include: ['main'] });
      expect(violations).toHaveLength(0);
    });
  });
});
