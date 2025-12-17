/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import qs from 'query-string';
import { test, testData } from '../../fixtures';

const DEPENDENCY_NAME = 'postgresql';
const SPAN_NAME = 'SELECT * FROM product';

const gotoParams = {
  dependencyName: DEPENDENCY_NAME,
  start: testData.OPBEANS_START_DATE,
  end: testData.OPBEANS_END_DATE,
};

test.describe('Dependency Operations Tab', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('Is accessible from the default tab', async ({
    page,
    pageObjects: { dependencyDetailsPage },
  }) => {
    await test.step('Land on dependency details page', async () => {
      await dependencyDetailsPage.gotoPage(gotoParams);
    });

    await test.step('Navigate to operations tab', async () => {
      await dependencyDetailsPage.expectOperationsTabVisible();
      await dependencyDetailsPage.clickOperationsTab();
    });

    await test.step('Land on operations tab', async () => {
      expect(page.url()).toContain(`/dependencies`);
      await dependencyDetailsPage.expectOperationsTabSelected();
    });
  });

  // Assertions are done within the page object
  // eslint-disable-next-line playwright/expect-expect
  test('Renders expected content', async ({ pageObjects: { dependencyDetailsPage } }) => {
    await test.step('Land on operations tab', async () => {
      await dependencyDetailsPage.gotoOperationsTab(gotoParams);
    });

    await test.step('Renders operations content', async () => {
      await dependencyDetailsPage.expectOperationsTableVisible();
      await dependencyDetailsPage.expectOperationInOperationsTable('SELECT * FROM product');
    });
  });

  test('Links to dependency operation detail when clicking on an operation in operations table', async ({
    page,
    pageObjects: { dependencyDetailsPage },
  }) => {
    await test.step('Land on operations tab', async () => {
      await dependencyDetailsPage.gotoOperationsTab(gotoParams);
    });

    await test.step('Click on operation in operations table', async () => {
      await dependencyDetailsPage.clickOperationInOperationsTable(SPAN_NAME);
    });

    await test.step('Land on dependency operation page', async () => {
      const url = page.url();
      expect(url).toContain(`/dependencies/operation`);
      expect(url).toContain(qs.stringify({ spanName: SPAN_NAME }, { encode: true }));
    });
  });

  test('Has no a11y violations on load', async ({
    page,
    pageObjects: { dependencyDetailsPage },
  }) => {
    await test.step('Land on operations tab', async () => {
      await dependencyDetailsPage.gotoOperationsTab(gotoParams);
    });

    await test.step('Check a11y', async () => {
      const { violations } = await page.checkA11y({ include: ['main'] });
      expect(violations).toHaveLength(0);
    });
  });
});
