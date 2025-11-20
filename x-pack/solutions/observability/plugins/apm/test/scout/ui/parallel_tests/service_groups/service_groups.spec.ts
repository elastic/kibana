/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';

test.describe('Service Groups', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { serviceGroupsPage } }) => {
    await browserAuth.loginAsPrivilegedUser();
    await serviceGroupsPage.gotoServiceGroupsPageWithDateSelected(
      testData.OPBEANS_START_DATE,
      testData.OPBEANS_END_DATE
    );
  });

  test('When navigating to service groups', async ({
    page,
    pageObjects: { serviceGroupsPage },
  }) => {
    await test.step('shows no service groups initially', async () => {
      // If there are no service groups, the page shows this heading
      await expect(
        page.getByRole('heading', { name: 'No service groups', level: 2 })
      ).toBeVisible();
    });

    await test.step('creates a service group', async () => {
      await serviceGroupsPage.createNewServiceGroup('go services');

      // open the service picker and filter by agent name
      await serviceGroupsPage.typeInTheSearchBar('agent.name:"go"');

      // verify expected synthetic services are listed and save
      await serviceGroupsPage.expectByText(['synth-go-1', 'synth-go-2']);
      await page.getByText('Save group').click();
      // wait for UI to reflect the created group
      await expect(page.getByText('1 group')).toBeVisible();
    });

    await test.step('shows created group in the list', async () => {
      const card = page.getByTestId('serviceGroupCard');
      await expect(card).toContainText('go services');
      await expect(card).toContainText('2 services');
    });

    await test.step('opens service list when clicking on service group card', async () => {
      await page.getByTestId('serviceGroupCard').click();
      await serviceGroupsPage.expectByText(['go services', 'synth-go-1', 'synth-go-2']);
    });

    await test.step('deletes the service group', async () => {
      // open edit flow and delete
      await page.getByRole('button', { name: 'Edit group' }).click();
      await page.getByTestId('apmDeleteGroupButton').click();

      // after deletion there should be no service groups
      await page.waitForLoadingIndicatorHidden();
      await expect(
        page.getByRole('heading', { name: 'No service groups', level: 2 })
      ).toBeVisible();
    });
  });
});
