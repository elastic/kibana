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

test.describe('Service Map', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, page, pageObjects: { serviceMapPage } }) => {
    await browserAuth.loginAsViewer();
    await serviceMapPage.gotoWithDateSelected(start, end);
    await page.waitForSelector(
      '[data-test-subj="kbnAppWrapper visibleChrome"] [aria-busy="false"]',
      { state: 'visible' }
    );
  });
  test('shows the service map', async ({ page, pageObjects: { serviceMapPage } }) => {
    await serviceMapPage.gotoWithDateSelected(start, end);
    expect(page.url()).toContain('/app/apm/service-map');
    await page.waitForSelector('[data-test-subj="serviceMap"]');
    await expect(page.getByTestId('serviceMap').getByLabel('Loading')).toBeHidden();
    await page.getByLabel('Zoom In').click();
    await page.getByTestId('centerServiceMap').click();
    await expect(page.getByTestId('serviceMap').getByLabel('Loading')).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.getByTestId('serviceMap').click();
    await expect(page.getByTestId('serviceMap')).toHaveScreenshot('service_map.png', {
      animations: 'disabled',
    });
  });

  test('shows a detailed service map', async ({ page, pageObjects: { serviceMapPage } }) => {
    await serviceMapPage.gotoDetailedServiceMapWithDateSelected(start, end);
    expect(page.url()).toContain('/services/opbeans-java/service-map');
    await page.waitForSelector('[data-test-subj="serviceMap"]');
    await expect(page.getByTestId('serviceMap').getByLabel('Loading')).toBeHidden();
    await page.getByLabel('Zoom out').click();
    await page.getByTestId('centerServiceMap').click();
    await expect(page.getByTestId('serviceMap').getByLabel('Loading')).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.getByTestId('serviceMap').click();
    await expect(page.getByTestId('serviceMap')).toHaveScreenshot('detailed_service_map.png', {
      animations: 'disabled',
    });
  });

  test('shows empty state when there is no data', async ({
    page,
    pageObjects: { serviceMapPage },
  }) => {
    await serviceMapPage.typeInTheSearchBar();
    await expect(page.getByTestId('serviceMap').getByLabel('Loading')).toBeHidden();
    page.getByText('No services available');
    // search bar is still visible
    await expect(page.getByTestId('apmUnifiedSearchBar')).toBeVisible();
  });
});
