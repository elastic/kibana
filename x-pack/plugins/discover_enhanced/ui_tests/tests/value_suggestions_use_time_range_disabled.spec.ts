/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test, testData, assertionMessages } from '../fixtures';

test.describe(
  'Discover app - value suggestions: useTimeRange disabled',
  { tag: ['@ess', '@svlSecurity', '@svlOblt', '@svlSearch'] },
  () => {
    test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
      await kbnClient.importExport.load(testData.KBN_ARCHIVES.DASHBOARD_DRILLDOWNS);
      await uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.LOGSTASH, // TODO: investigate why it is required for `node scripts/playwright_test.js` run
        'doc_table:legacy': false,
        'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_DEFAULT_START_TIME}", "to": "${testData.LOGSTASH_DEFAULT_END_TIME}"}`,
        'autocomplete:useTimeRange': false,
      });
    });

    test.afterAll(async ({ uiSettings, kbnClient }) => {
      await uiSettings.unset('doc_table:legacy', 'defaultIndex', 'timepicker:timeDefaults');
      await uiSettings.set({ 'autocomplete:useTimeRange': true });
      await kbnClient.savedObjects.cleanStandardList();
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    test('show up if outside of range', async ({ page, pageObjects }) => {
      await pageObjects.datePicker.setAbsoluteRange(testData.LOGSTASH_OUT_OF_RANGE_DATES);
      await page.testSubj.fill('queryInput', 'extension.raw : ');
      await expect(
        page.testSubj.locator('autoCompleteSuggestionText'),
        assertionMessages.QUERY_BAR_VALIDATION.SUGGESTIONS_COUNT
      ).toHaveCount(5);
      const actualSuggestions = await page.testSubj
        .locator('autoCompleteSuggestionText')
        .allTextContents();
      expect(actualSuggestions.join(',')).toContain('jpg');
    });

    test('show up if in range', async ({ page, pageObjects }) => {
      await pageObjects.datePicker.setAbsoluteRange(testData.LOGSTASH_IN_RANGE_DATES);
      await page.testSubj.fill('queryInput', 'extension.raw : ');
      await expect(
        page.testSubj.locator('autoCompleteSuggestionText'),
        assertionMessages.QUERY_BAR_VALIDATION.SUGGESTIONS_COUNT
      ).toHaveCount(5);
      const actualSuggestions = await page.testSubj
        .locator('autoCompleteSuggestionText')
        .allTextContents();
      expect(actualSuggestions.join(',')).toContain('jpg');
    });
  }
);
