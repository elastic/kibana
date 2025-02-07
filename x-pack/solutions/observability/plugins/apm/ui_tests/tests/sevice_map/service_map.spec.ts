/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../fixtures';

test.describe('Service Map', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { serviceMapPage }, page }) => {
    await browserAuth.loginAsViewer();
    await serviceMapPage.goto();
    await page.waitForSelector(
      '[data-test-subj="kbnAppWrapper visibleChrome"] [aria-busy="false"]',
      { state: 'visible' }
    );
  });

  test('The page loads correctly', async ({ page }) => {
    expect(page.url()).toContain('/app/apm/service-map');
  });
});
