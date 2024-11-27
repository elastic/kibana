/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';

test.describe('Discover app - value suggestions', () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
    await kbnClient.importExport.load(
      'x-pack/test/functional/fixtures/kbn_archiver/dashboard_drilldowns/drilldowns'
    );
    await kbnClient.uiSettings.update({
      defaultIndex: 'logstash-*', // TODO: investigate why it is required for `node scripts/playwright_test.js` run
    });
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.unset('defaultIndex');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto();
  });

  test('dont show up if outside of range', async ({ page, pageObjects }) => {
    await pageObjects.datePicker.setAbsoluteRange({
      from: 'Mar 1, 2020 @ 00:00:00.000',
      to: 'Nov 1, 2020 @ 00:00:00.000',
    });

    await page.testSubj.fill('queryInput', 'extension.raw : ');
    await expect(page.testSubj.locator('autoCompleteSuggestionText')).toHaveCount(0);
  });

  test('show up if in range', async ({ page, pageObjects }) => {
    await pageObjects.datePicker.setAbsoluteRange({
      from: 'Sep 19, 2015 @ 06:31:44.000',
      to: 'Sep 23, 2015 @ 18:31:44.000',
    });
    await page.testSubj.fill('queryInput', 'extension.raw : ');
    await expect(page.testSubj.locator('autoCompleteSuggestionText')).toHaveCount(5);
    const actualSuggestions = await page.testSubj
      .locator('autoCompleteSuggestionText')
      .allTextContents();
    expect(actualSuggestions.join(',')).toContain('jpg');
  });
});
