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
      await dependencyDetailsPage.gotoPage();
    });

    await test.step('Verify overview tab is selected', async () => {
      await dependencyDetailsPage.expectOverviewTabVisible();
      await dependencyDetailsPage.expectOverviewTabSelected();

      const url = page.url();
      expect(url).toContain(`/dependencies/overview`);
    });
  });

  // Assertions are done within the page object
  // eslint-disable-next-line playwright/expect-expect
  test('Renders expected content', async ({ pageObjects: { dependencyDetailsPage } }) => {
    await test.step('Land on overview tab', async () => {
      await dependencyDetailsPage.gotoOverviewTab();
    });

    await test.step('Renders overview content', async () => {
      await dependencyDetailsPage.expectLatencyChartVisible();
      await dependencyDetailsPage.expectThroughputChartVisible();
      await dependencyDetailsPage.expectFailedTransactionRateChartVisible();
      await dependencyDetailsPage.expectUpstreamServicesTableVisible();
      await dependencyDetailsPage.expectServiceInUpstreamServicesTable(SERVICE_NAME);
    });
  });

  test('Links to service overview when clicking on a service in upstream services table', async ({
    page,
    pageObjects: { dependencyDetailsPage },
  }) => {
    await test.step('Land on overview tab', async () => {
      await dependencyDetailsPage.gotoOverviewTab();
    });

    await test.step('Click on a service in upstream services table', async () => {
      await dependencyDetailsPage.clickServiceInUpstreamServicesTable(SERVICE_NAME);
    });

    await test.step('Lands on the service overview page', async () => {
      const url = page.url();
      expect(url).toContain(`/services/${SERVICE_NAME}/overview`);
    });
  });

  test('Has no detectable a11y violations on load', async ({
    page,
    pageObjects: { dependencyDetailsPage },
  }) => {
    await test.step('Land on dependencies tab', async () => {
      await dependencyDetailsPage.gotoOverviewTab();
    });

    await test.step('Check a11y', async () => {
      const { violations } = await page.checkA11y({ include: ['main'] });
      expect(violations).toHaveLength(0);
    });
  });
});
