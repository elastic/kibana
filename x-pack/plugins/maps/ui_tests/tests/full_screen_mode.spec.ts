/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import { test } from '../fixtures';

test.describe('Maps full screen mode', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin(); // add layer button not there when logged in as viewer
    await pageObjects.gis.goto();
  });
  test('Full screen button should be visisble', async ({ page }) => {
    const sel = 'mapsFullScreenMode';
    await expect(
      page.testSubj.locator(sel),
      `Could not find the Full screen button, using selector ${sel}`
    ).toBeVisible();
  });
  test('full screen mode hides the kbn app wrapper', async ({ page, pageObjects }) => {
    expect(
      await page.testSubj.locator('kbnAppWrapper visibleChrome').waitFor({ state: 'visible' })
    );
    await page.testSubj.click('mapsFullScreenMode');
    expect(await page.testSubj.locator('kbnAppWrapper hiddenChrome').waitFor({ state: 'visible' }));
  });
  test('layer control is visible', async ({ page }) => {
    expect(await page.testSubj.locator('addLayerButton').waitFor({ state: 'visible' }));
  });
  test('displays reenMode();exit full screen logo button', async ({ page, pageObjects }) => {
    await page.testSubj.click('mapsFullScreenMode');
    const sel = 'exitFullScreenModeButton';
    await expect(
      page.testSubj.locator(sel),
      `Could not find the exit full screen button, using selector ${sel}`
    ).toBeVisible();
  });
  // Note: The following test seems superfluous due to the it block named "full screen mode hides the kbn app wrapper" above.
  test('the kbn app wrapper is visible when full screen mode is exited', async ({
    page,
    pageObjects,
  }) => {
    await page.testSubj.click('mapsFullScreenMode');
    await page.testSubj.click('exitFullScreenModeText');
    expect(
      await page.testSubj.locator('kbnAppWrapper visibleChrome').waitFor({ state: 'visible' })
    );
  });
});
