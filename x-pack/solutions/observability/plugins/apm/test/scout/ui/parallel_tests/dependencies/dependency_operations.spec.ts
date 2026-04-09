/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';

const SPAN_NAME = 'SELECT * FROM product';

test.describe(
  'Dependency Operations Tab',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('Is accessible from the default tab', async ({
      page,
      pageObjects: { dependencyDetailsPage },
    }) => {
      await test.step('land on dependency details page', async () => {
        await dependencyDetailsPage.goToPage();
      });

      await test.step('navigate to operations tab', async () => {
        await expect(dependencyDetailsPage.operationsTab.tab).toBeVisible();
        await dependencyDetailsPage.operationsTab.goToTab();
      });

      await test.step('land on operations tab', async () => {
        expect(page.url()).toContain(`/dependencies`);
        await expect(dependencyDetailsPage.operationsTab.tab).toHaveAttribute(
          'aria-selected',
          'true'
        );
      });
    });

    test('Renders expected content', async ({ pageObjects: { dependencyDetailsPage } }) => {
      await test.step('land on operations tab', async () => {
        await dependencyDetailsPage.operationsTab.goToTab();
      });

      await test.step('renders operations content', async () => {
        await expect(dependencyDetailsPage.operationsTab.operationsTable).toBeVisible();
        await expect(
          dependencyDetailsPage.operationsTab.getOperationInOperationsTable(SPAN_NAME)
        ).toBeVisible();
      });
    });

    test('Links to dependency operation detail when clicking on an operation in operations table', async ({
      page,
      pageObjects: { dependencyDetailsPage },
    }) => {
      await test.step('land on operations tab', async () => {
        await dependencyDetailsPage.operationsTab.goToTab();
      });

      await test.step('click on operation in operations table', async () => {
        await dependencyDetailsPage.operationsTab.clickOperationInOperationsTable(SPAN_NAME);
      });

      await test.step('land on dependency operation page', async () => {
        const url = new URL(page.url());
        expect(url.pathname).toContain(`/dependencies/operation`);
        expect(url.searchParams.get('spanName')).toBe(SPAN_NAME);
      });
    });

    test('Has no a11y violations on load', async ({
      page,
      pageObjects: { dependencyDetailsPage },
    }) => {
      await test.step('land on operations tab', async () => {
        await dependencyDetailsPage.operationsTab.goToTab();
      });

      await test.step('check a11y', async () => {
        const { violations } = await page.checkA11y({ include: ['main'] });
        expect(violations).toHaveLength(0);
      });
    });
  }
);
