/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test, testData } from '../fixtures';

test.describe('Discover app - errors', { tag: ['@ess'] }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
    await kbnClient.savedObjects.clean({ types: ['search', 'index-pattern'] });
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.INVALID_SCRIPTED_FIELD);
    await uiSettings.setDefaultTime({
      from: testData.LOGSTASH_DEFAULT_START_TIME,
      to: testData.LOGSTASH_DEFAULT_END_TIME,
    });
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto();
  });

  test('should render invalid scripted field error', async ({ page }) => {
    await page.testSubj.locator('discoverErrorCalloutTitle').waitFor({ state: 'visible' });
    await expect(
      page.testSubj.locator('painlessStackTrace'),
      'Painless error stacktrace should be displayed'
    ).toBeVisible();
  });
});
