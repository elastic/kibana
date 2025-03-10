/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expect } from '@kbn/scout';
import { test } from '../../fixtures';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

test.describe('Service Inventory', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, page, pageObjects: { serviceInventoryPage } }) => {
    await browserAuth.loginAsViewer();
    await serviceInventoryPage.gotoDetailedServiceInventoryWithDateSelected(start, end);
    await serviceInventoryPage.waitForPageToLoad();
  });

  test('shows the service inventory', async ({ page, pageObjects: { serviceInventoryPage } }) => {
    await serviceInventoryPage.gotoDetailedServiceInventoryWithDateSelected(start, end);
    expect(page.url()).toContain('/app/apm/services');
    await expect(page.getByRole('heading', { name: 'Services', level: 1 })).toBeVisible();
  });

  test('shows a list of services', async ({ page }) => {
    await expect(page.getByText('opbeans-node')).toBeVisible();
    await expect(page.getByText('opbeans-java')).toBeVisible();
    await expect(page.getByText('opbeans-rum')).toBeVisible();
  });

  test('shows a list of environments', async ({ page }) => {
    const environmentEntrySelector = page.locator('td:has-text("production")');
    await expect(environmentEntrySelector).toHaveCount(3);
  });

  test('loads the service overview for a service when clicking on it', async ({ page }) => {
    await page.getByText('opbeans-node').click();
    expect(page.url()).toContain('/apm/services/opbeans-node/overview');
    await expect(page.getByTestId('apmMainTemplateHeaderServiceName')).toHaveText('opbeans-node');
  });

  test('shows the correct environment when changing the environment', async ({ page }) => {
    await page
      .locator('[data-test-subj="environmentFilter"]')
      .locator('[data-test-subj="comboBoxSearchInput"]')
      .click();
    await expect(
      page.getByTestId('comboBoxOptionsList environmentFilter-optionsList')
    ).toBeVisible();
    await page
      .locator('[data-test-subj="comboBoxOptionsList environmentFilter-optionsList"]')
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
