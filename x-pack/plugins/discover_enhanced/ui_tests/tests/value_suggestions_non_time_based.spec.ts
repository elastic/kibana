/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test, testData, errorMessages } from '../fixtures';

test.describe(
  'Discover app - value suggestions non-time based',
  { tag: ['@ess', '@svlSecurity', '@svlOblt', '@svlSearch'] },
  () => {
    test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.NO_TIME_FIELD);
      await kbnClient.importExport.load(testData.KBN_ARCHIVES.NO_TIME_FIELD);
      await uiSettings.set({
        defaultIndex: 'without-timefield',
        'doc_table:legacy': false,
      });
    });

    test.afterAll(async ({ kbnClient, uiSettings }) => {
      await uiSettings.unset('doc_table:legacy', 'defaultIndex');
      await kbnClient.savedObjects.cleanStandardList();
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    test('shows all auto-suggest options for a filter in discover context app', async ({
      page,
    }) => {
      await page.testSubj.fill('queryInput', 'type.keyword : ');
      await expect(
        page.testSubj.locator('autoCompleteSuggestionText'),
        errorMessages.QUERY_BAR_VALIDATION.SUGGESTIONS_COUNT
      ).toHaveCount(1);
      const actualSuggestions = await page.testSubj
        .locator('autoCompleteSuggestionText')
        .allTextContents();
      expect(actualSuggestions.join(',')).toContain('"apache"');
    });
  }
);
