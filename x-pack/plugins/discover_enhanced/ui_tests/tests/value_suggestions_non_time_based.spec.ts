/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';

test.describe('Discover app - value suggestions non-time based', () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(
      'test/functional/fixtures/es_archiver/index_pattern_without_timefield'
    );
    await kbnClient.importExport.load(
      'test/functional/fixtures/kbn_archiver/index_pattern_without_timefield'
    );
    await kbnClient.uiSettings.update({
      defaultIndex: 'without-timefield',
      'doc_table:legacy': false,
    });
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.unset('doc_table:legacy');
    await kbnClient.uiSettings.unset('defaultIndex');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto();
  });

  test('shows all auto-suggest options for a filter in discover context app', async ({ page }) => {
    await page.testSubj.fill('queryInput', 'type.keyword : ');
    await expect(page.testSubj.locator('autoCompleteSuggestionText')).toHaveCount(1);
    const actualSuggestions = await page.testSubj
      .locator('autoCompleteSuggestionText')
      .allTextContents();
    expect(actualSuggestions.join(',')).toContain('"apache"');
  });
});
