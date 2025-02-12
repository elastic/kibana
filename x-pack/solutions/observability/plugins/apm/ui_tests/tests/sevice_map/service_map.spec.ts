/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../fixtures';
import { opbeans } from '../../fixtures/synthtrace/opbeans';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

test.describe('Service Map', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(
    async ({ apmSynthtraceEsClient, browserAuth, page, pageObjects: { serviceMapPage } }) => {
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

  test.afterAll(async ({ apmSynthtraceEsClient }) => {
    await apmSynthtraceEsClient.clean();
  });

  test('shows the service map', async ({ page, pageObjects: { serviceMapPage } }) => {
    await serviceMapPage.gotoWithDateSelected(start, end);
    expect(page.url()).toContain('/app/apm/service-map');
    await page.waitForSelector('[data-test-subj="serviceMap"]');
    await expect(page.getByTestId('serviceMap').getByLabel('Loading')).not.toBeVisible();
    await page.getByTestId('centerServiceMap').click();
    await expect(page.getByTestId('serviceMap').getByLabel('Loading')).not.toBeVisible();
    await expect(await page.getByTestId('serviceMap')).toHaveScreenshot('service_map.png');
  });

  test('shows a detailed service map', async ({ page, pageObjects: { serviceMapPage } }) => {
    await serviceMapPage.gotoDetailedServiceMapWithDateSelected(start, end);
    expect(page.url()).toContain('/services/opbeans-java/service-map');
    await page.waitForSelector('[data-test-subj="serviceMap"]');
    await expect(page.getByTestId('serviceMap').getByLabel('Loading')).not.toBeVisible();
    await page.getByTestId('centerServiceMap').click();
    await expect(page.getByTestId('serviceMap').getByLabel('Loading')).not.toBeVisible();
    await expect(await page.getByTestId('serviceMap')).toHaveScreenshot('detailed_service_map.png');
  });

  test('shows empty state when there is no data', async ({
    page,
    pageObjects: { serviceMapPage },
  }) => {
    await serviceMapPage.typeInTheSearchBar();
    await expect(page.getByTestId('serviceMap').getByLabel('Loading')).not.toBeVisible();
    await page.getByText('No services available');
    // search bar is still visible
    await expect(page.getByTestId('apmUnifiedSearchBar')).toBeVisible();
  });
});
