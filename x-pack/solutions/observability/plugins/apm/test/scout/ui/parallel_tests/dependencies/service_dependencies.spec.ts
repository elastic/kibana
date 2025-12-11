/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';

const SERVICE_NAME = 'opbeans-java';
const DEPENDENCY_NAME = 'postgresql';

const gotoParams = {
  serviceName: SERVICE_NAME,
  start: testData.OPBEANS_START_DATE,
  end: testData.OPBEANS_END_DATE,
};

test.describe('Service Dependencies Tab', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('Is accessible from the default tab', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await test.step('Land on service details page', async () => {
      await serviceDetailsPage.gotoPage(gotoParams);
    });

    await test.step('Navigate to dependencies tab', async () => {
      await serviceDetailsPage.expectDependenciesTabVisible();
      await serviceDetailsPage.clickDependenciesTab();
    });

    await test.step('Land on dependencies tab', async () => {
      expect(page.url()).toContain(`/dependencies`);
    });
  });

  // Assertions are done within the page object
  // eslint-disable-next-line playwright/expect-expect
  test('Renders expected content', async ({ pageObjects: { serviceDetailsPage } }) => {
    await test.step('Land on dependencies tab', async () => {
      await serviceDetailsPage.gotoDependenciesTab(gotoParams);
    });

    await test.step('Renders dependencies content', async () => {
      await serviceDetailsPage.expectDependenciesBreakdownChartVisible();
      await serviceDetailsPage.expectDependenciesTableVisible();
      await serviceDetailsPage.expectDependencyInDependenciesTable(DEPENDENCY_NAME);
    });
  });

  test('Links to service overview when clicking on a dependency in dependencies table', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await test.step('Land on dependencies tab', async () => {
      await serviceDetailsPage.gotoDependenciesTab(gotoParams);
    });

    await test.step('Click on a dependency in dependencies table', async () => {
      await serviceDetailsPage.clickDependencyInDependenciesTable(DEPENDENCY_NAME);
    });

    await test.step('Lands on the dependency service overview page', async () => {
      const url = page.url();
      expect(url).toContain('/dependencies/overview');
      expect(url).toContain(`dependencyName=${DEPENDENCY_NAME}`);
    });
  });

  test('Has no detectable a11y violations on load', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await test.step('Land on dependencies tab', async () => {
      await serviceDetailsPage.gotoDependenciesTab(gotoParams);
    });

    await test.step('Check a11y', async () => {
      const { violations } = await page.checkA11y({ include: ['main'] });
      expect(violations).toHaveLength(0);
    });
  });
});
