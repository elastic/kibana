/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';

test.describe('Service Inventory', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { serviceInventoryPage } }) => {
    await browserAuth.loginAsViewer();
    await serviceInventoryPage.gotoDetailedServiceInventoryWithDateSelected(
      testData.OPBEANS_START_DATE,
      testData.OPBEANS_END_DATE
    );
  });

  test('renders page with selected date range', async ({ page }) => {
    await test.step('shows correct heading', async () => {
      expect(page.url()).toContain('/app/apm/services');
      await expect(page.getByRole('heading', { name: 'Services', level: 1 })).toBeVisible();
    });

    await test.step('shows a list of services', async () => {
      await expect(page.getByText('opbeans-node')).toBeVisible();
      await expect(page.getByText('opbeans-java')).toBeVisible();
      await expect(page.getByText('opbeans-rum')).toBeVisible();
    });

    await test.step('shows a list of environments', async () => {
      const environmentEntrySelector = page.locator('td:has-text("production")');
      await expect(environmentEntrySelector).toHaveCount(3);
    });
  });

  test('loads the service overview for a service when clicking on it', async ({ page }) => {
    await page.getByText('opbeans-node').click();
    expect(page.url()).toContain('/apm/services/opbeans-node/overview');
    await expect(page.getByTestId('apmMainTemplateHeaderServiceName')).toHaveText('opbeans-node');
  });

  test('shows the correct environment when changing the environment', async ({ page }) => {
    await page.testSubj.click('environmentFilter > comboBoxSearchInput');
    await page
      .getByTestId('comboBoxOptionsList environmentFilter-optionsList')
      .locator('button:has-text("production")')
      .click();
    await expect(page.getByTestId('comboBoxSearchInput')).toHaveValue('production');
  });

  test('shows the filtered services when using the service name fast filter', async ({ page }) => {
    await expect(page.getByTestId('tableSearchInput')).toBeVisible();
    await expect(page.getByText('opbeans-node')).toBeVisible();
    await expect(page.getByText('opbeans-java')).toBeVisible();
    await expect(page.getByText('opbeans-rum')).toBeVisible();
    await page.getByTestId('tableSearchInput').fill('java');
    await expect(page.getByText('opbeans-node')).toBeHidden();
    await expect(page.getByText('opbeans-java')).toBeVisible();
    await expect(page.getByText('opbeans-rum')).toBeHidden();
    await page.getByTestId('tableSearchInput').clear();
    await expect(page.getByText('opbeans-node')).toBeVisible();
    await expect(page.getByText('opbeans-java')).toBeVisible();
    await expect(page.getByText('opbeans-rum')).toBeVisible();
  });
});
