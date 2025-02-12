/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../fixtures';
import { opbeans } from '../../fixtures/synthtrace/opbeans';

const start = '2024-10-10T10:00:00.000Z';
const end = '2024-10-10T00:11:00.000Z';

test.describe('Service Map', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(
    async ({ browserAuth, apmSynthtraceEsClient, pageObjects: { serviceMapPage }, page }) => {
      await apmSynthtraceEsClient.index(
        opbeans({
          from: new Date(start).getTime(),
          to: new Date(end).getTime(),
        })
      );
      await browserAuth.loginAsViewer();
      await serviceMapPage.gotoWithDateSelected(start, end);
      await page.waitForSelector(
        '[data-test-subj="kbnAppWrapper visibleChrome"] [aria-busy="false"]',
        { state: 'visible' }
      );
    }
  );

  // test.afterAll(async ({ apmSynthtraceEsClient }) => {
  // await apmSynthtraceEsClient.clean();
  // });

  test('The page loads correctly', async ({ page }) => {
    expect(page.url()).toContain('/app/apm/service-map');
    await page.waitForSelector('[data-test-subj="serviceMap"]');
    const loadingSpinner = page.getByTestId('serviceMap').getByLabel('Loading');
    await expect(loadingSpinner).not.toBeVisible();

    // expect(page.url()).toContain(start);
    // expect(page.url()).toContain(end);
    // await expect(page).toHaveScreenshot();
  });
  // test('shows empty state when there is no data', async ({
  //   page,
  //   pageObjects: { serviceMapPage },
  // }) => {
  //   await serviceMapPage.typeInTheSearchBar();
  //   await page.getByText('No services available');
  //   // search bar is still visible
  //   await serviceMapPage.getSearchBar();
  // });
});
