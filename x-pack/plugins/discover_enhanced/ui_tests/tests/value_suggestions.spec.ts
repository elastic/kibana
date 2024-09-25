/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { subj } from '@kbn/test-subj-selector';
import { expect } from '@playwright/test';
import { test } from '../fixtures';
import { DiscoverApp, DatePicker } from '../page_objects';

test.describe('Discover app - value suggestions', () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
    await kbnClient.importExport.load(
      'x-pack/test/functional/fixtures/kbn_archiver/dashboard_drilldowns/drilldowns'
    );
    await kbnClient.uiSettings.update({
      'doc_table:legacy': false,
    });
  });

  test.afterAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
    await kbnClient.uiSettings.unset('doc_table:legacy');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test.beforeEach(async ({ page, kbnUrl, browserAuth }) => {
    const discoverApp = new DiscoverApp(page, kbnUrl);
    await browserAuth.loginAs('editor');
    await discoverApp.goto();
  });

  test('dont show up if outside of range', async ({ page }) => {
    const fromTime = 'Mar 1, 2020 @ 00:00:00.000';
    const toTime = 'Nov 1, 2020 @ 00:00:00.000';
    const datePicker = new DatePicker(page);
    await datePicker.setAbsoluteRange(fromTime, toTime);

    await page.fill(subj('queryInput'), 'extension.raw : ');
    await expect(page.locator(subj('autoCompleteSuggestionText'))).toHaveCount(0);
  });

  test('show up if in range', async ({ page }) => {
    const fromTime = 'Sep 19, 2015 @ 06:31:44.000';
    const toTime = 'Sep 23, 2015 @ 18:31:44.000';
    const datePicker = new DatePicker(page);
    await datePicker.setAbsoluteRange(fromTime, toTime);

    await page.fill(subj('queryInput'), 'extension.raw : ');
    await expect(page.locator(subj('autoCompleteSuggestionText'))).toHaveCount(5);
    const actualSuggestions = await page
      .locator(subj('autoCompleteSuggestionText'))
      .allTextContents();
    expect(actualSuggestions.join(',')).toContain('jpg');
  });
});
