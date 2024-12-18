/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import { test } from '../fixtures';

test.describe('Maps full screen mode', { tag: tags.ESS_ONLY } , () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.gis.goto();
  });
  test('Full screen button should be visisble', async ({ page }) => {
    const sel = 'mapsFullScreenMode';
    await expect(
      page.testSubj.locator(sel),
      `Could not find the Full screen in the ui, using selector ${sel}`
    ).toBeVisible();
  });
  test('full screen mode hides the kbn app wrapper', async ({ page, pageObjects }) => {
    expect(await page.testSubj.locator('kbnAppWrapper visibleChrome').waitFor({state: 'visible'}));
    await pageObjects.gis.clickFullScreenMode();
    expect(await page.testSubj.locator('kbnAppWrapper hiddenChrome').waitFor({state: 'visible'}));
    await pageObjects.gis.clickExitFullScreenTextButton();
    expect(await page.testSubj.locator('kbnAppWrapper visibleChrome').waitFor({state: 'visible'}));
  });
  test.skip('layer control is visible', async ({ page }) => {
    expect(await page.testSubj.locator('addLayerButton').waitFor({state: 'visible'}));
  });
  // test('displays exit full screen logo button', async ({ page }) => {
  // });
  // test('exits when the text button is clicked on', async ({ page }) => {
  // });
});
