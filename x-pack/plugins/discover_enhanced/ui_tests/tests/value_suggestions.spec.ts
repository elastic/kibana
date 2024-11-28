/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';
import {
  ES_ARCHIVES,
  KBN_ARCHIVES,
  LOGSTASH_DEFAULT_END_TIME,
  LOGSTASH_DEFAULT_START_TIME,
  LOGSTASH_IN_RANGE_DATES,
  LOGSTASH_OUT_OF_RANGE_DATES,
} from '../fixtures/constants';

test.describe(
  'Discover app - value suggestions: useTimeRange enabled',
  { tag: ['@ess', '@svlSecurity', '@svlOblt', '@svlSearch'] },
  () => {
    test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
      await esArchiver.loadIfNeeded(ES_ARCHIVES.LOGSTASH);
      await kbnClient.importExport.load(KBN_ARCHIVES.DASHBOARD_DRILLDOWNS);
      await uiSettings.set({
        defaultIndex: 'logstash-*', // TODO: investigate why it is required for `node scripts/playwright_test.js` run
        'doc_table:legacy': false,
        'timepicker:timeDefaults': `{ "from": "${LOGSTASH_DEFAULT_START_TIME}", "to": "${LOGSTASH_DEFAULT_END_TIME}"}`,
      });
    });

    test.afterAll(async ({ kbnClient, uiSettings }) => {
      await uiSettings.unset('doc_table:legacy', 'defaultIndex', 'timepicker:timeDefaults');
      await kbnClient.savedObjects.cleanStandardList();
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    test('dont show up if outside of range', async ({ page, pageObjects }) => {
      await pageObjects.datePicker.setAbsoluteRange(LOGSTASH_OUT_OF_RANGE_DATES);
      await page.testSubj.fill('queryInput', 'extension.raw : ');
      await expect(page.testSubj.locator('autoCompleteSuggestionText')).toHaveCount(0);
    });

    test('show up if in range', async ({ page, pageObjects }) => {
      await pageObjects.datePicker.setAbsoluteRange(LOGSTASH_IN_RANGE_DATES);
      await page.testSubj.fill('queryInput', 'extension.raw : ');
      await expect(page.testSubj.locator('autoCompleteSuggestionText')).toHaveCount(5);
      const actualSuggestions = await page.testSubj
        .locator('autoCompleteSuggestionText')
        .allTextContents();
      expect(actualSuggestions.join(',')).toContain('jpg');
    });

    test('also displays descriptions for operators', async ({ page, pageObjects }) => {
      await pageObjects.datePicker.setAbsoluteRange(LOGSTASH_IN_RANGE_DATES);
      await page.testSubj.fill('queryInput', 'extension.raw');
      await expect(page.testSubj.locator('^autocompleteSuggestion-operator')).toHaveCount(2);
    });
  }
);
