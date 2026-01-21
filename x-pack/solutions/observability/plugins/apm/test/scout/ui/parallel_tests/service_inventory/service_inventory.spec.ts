/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';
import { PRODUCTION_ENVIRONMENT } from '../../fixtures/constants';

test.describe('Service inventory', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { serviceInventoryPage } }) => {
    await browserAuth.loginAsViewer();
    await serviceInventoryPage.gotoServiceInventory({
      rangeFrom: testData.START_DATE,
      rangeTo: testData.END_DATE,
    });
  });

  test('renders page with selected date range', async ({ page }) => {
    await test.step('shows correct heading', async () => {
      expect(page.url()).toContain('/app/apm/services');
      await expect(
        page.getByRole('heading', { name: 'Service inventory', level: 1 })
      ).toBeVisible();
    });

    await test.step('shows a list of services', async () => {
      await expect(page.getByText(testData.SERVICE_OPBEANS_NODE)).toBeVisible();
      await expect(page.getByText(testData.SERVICE_OPBEANS_JAVA)).toBeVisible();
      await expect(page.getByText(testData.SERVICE_OPBEANS_RUM)).toBeVisible();
    });

    await test.step('shows a list of environments', async () => {
      const environmentEntrySelector = page.locator(`td:has-text("${PRODUCTION_ENVIRONMENT}")`);
      await expect(environmentEntrySelector).toHaveCount(10);
    });
  });

  test('loads the service overview for a service when clicking on it', async ({ page }) => {
    await page.getByText(testData.SERVICE_OPBEANS_NODE).click();
    expect(page.url()).toContain(`/apm/services/${testData.SERVICE_OPBEANS_NODE}/overview`);
    await expect(page.getByTestId('apmMainTemplateHeaderServiceName')).toHaveText(
      testData.SERVICE_OPBEANS_NODE
    );
  });

  test('shows the correct environment when changing the environment', async ({ page }) => {
    await page.testSubj.click('environmentFilter > comboBoxSearchInput');
    await page
      .getByTestId('comboBoxOptionsList environmentFilter-optionsList')
      .locator(`button:has-text("${PRODUCTION_ENVIRONMENT}")`)
      .click();
    await expect(page.getByTestId('comboBoxSearchInput')).toHaveValue(PRODUCTION_ENVIRONMENT);
  });

  test('shows the filtered services when using the service name fast filter', async ({ page }) => {
    await expect(page.getByTestId('tableSearchInput')).toBeVisible();
    await expect(page.getByText(testData.SERVICE_OPBEANS_NODE)).toBeVisible();
    await expect(page.getByText(testData.SERVICE_OPBEANS_JAVA)).toBeVisible();
    await expect(page.getByText(testData.SERVICE_OPBEANS_RUM)).toBeVisible();
    await page.getByTestId('tableSearchInput').fill('java');
    await expect(page.getByText(testData.SERVICE_OPBEANS_NODE)).toBeHidden();
    await expect(page.getByText(testData.SERVICE_OPBEANS_JAVA)).toBeVisible();
    await expect(page.getByText(testData.SERVICE_OPBEANS_RUM)).toBeHidden();
    await page.getByTestId('tableSearchInput').clear();
    await expect(page.getByText(testData.SERVICE_OPBEANS_NODE)).toBeVisible();
    await expect(page.getByText(testData.SERVICE_OPBEANS_JAVA)).toBeVisible();
    await expect(page.getByText(testData.SERVICE_OPBEANS_RUM)).toBeVisible();
  });
});
