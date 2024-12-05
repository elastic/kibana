/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test, testData } from '../fixtures';
import type { ExtendedScoutTestFixtures } from '../fixtures';

const assertNoFilterAndEmptyQuery = async (
  filterBadge: { field: string; value: string },
  pageObjects: ExtendedScoutTestFixtures['pageObjects'],
  page: ExtendedScoutTestFixtures['page']
) => {
  expect(
    // checking if filter exists, enabled or disabled
    await pageObjects.filterBar.hasFilter(filterBadge),
    `Filter ${JSON.stringify(filterBadge)} should not exist`
  ).toBe(false);
  await expect(
    page.testSubj.locator('queryInput'),
    'Query Bar input field should be empty'
  ).toHaveText('');
};

const assertDataViewIsSelected = async (page: ExtendedScoutTestFixtures['page'], name: string) =>
  await expect(
    page.testSubj.locator('*dataView-switch-link'),
    'Incorrect data view is selected'
  ).toHaveText(name);

test.describe(
  'Discover app - saved searches',
  { tag: ['@ess', '@svlSecurity', '@svlOblt', '@svlSearch'] },
  () => {
    const START_TIME = '2019-04-27T23:56:51.374Z';
    const END_TIME = '2019-08-23T16:18:51.821Z';
    const PANEL_NAME = 'Ecommerce Data';
    const SEARCH_QUERY = 'customer_gender:MALE';
    const SAVED_SEARCH_NAME = 'test-unselect-saved-search';
    const filterFieldAndValue = {
      field: 'category',
      value: `Men's Shoes`,
    };

    test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.ECOMMERCE);
      await kbnClient.importExport.load(testData.KBN_ARCHIVES.DISCOVER);
      await kbnClient.importExport.load(testData.KBN_ARCHIVES.ECOMMERCE);
      await uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.ECOMMERCE,
        'timepicker:timeDefaults': `{ "from": "${START_TIME}", "to": "${END_TIME}"}`,
      });
    });

    test.afterAll(async ({ kbnClient, uiSettings }) => {
      await uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await kbnClient.savedObjects.cleanStandardList();
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test('should customize time range on dashboards', async ({ pageObjects, page }) => {
      await pageObjects.dashboard.goto();
      await pageObjects.dashboard.openNewDashboard();
      await pageObjects.dashboard.addPanelFromLibrary(PANEL_NAME);
      await page.testSubj.locator('savedSearchTotalDocuments').waitFor({
        state: 'visible',
      });

      await pageObjects.dashboard.customizePanel({
        name: PANEL_NAME,
        customTimeRageCommonlyUsed: { value: 'Last_90 days' },
      });
      await expect(
        page.testSubj.locator('embeddedSavedSearchDocTable').locator('.euiDataGrid__noResults'),
        'No results message in Saved Search panel should be visible'
      ).toBeVisible();
    });

    test(`should unselect saved search when navigating to a 'new'`, async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.discover.goto();
      await assertDataViewIsSelected(page, testData.DATA_VIEW.ECOMMERCE);
      await pageObjects.filterBar.addFilter({
        ...filterFieldAndValue,
        operator: 'is',
      });
      await page.testSubj.fill('queryInput', SEARCH_QUERY);
      await page.testSubj.click('querySubmitButton');
      await pageObjects.discover.waitForHistogramRendered();

      await pageObjects.discover.saveSearch(SAVED_SEARCH_NAME);
      await pageObjects.discover.waitForHistogramRendered();

      expect(
        await pageObjects.filterBar.hasFilter({
          ...filterFieldAndValue,
          enabled: true, // Filter is enabled by default
        })
      ).toBe(true);
      await expect(page.testSubj.locator('queryInput')).toHaveText(SEARCH_QUERY);

      // create new search
      await pageObjects.discover.clickNewSearch();
      await assertDataViewIsSelected(page, testData.DATA_VIEW.ECOMMERCE);
      await assertNoFilterAndEmptyQuery(filterFieldAndValue, pageObjects, page);

      // change data view
      await pageObjects.discover.selectDataView(testData.DATA_VIEW.LOGSTASH);
      await assertNoFilterAndEmptyQuery(filterFieldAndValue, pageObjects, page);

      // change data view again
      await pageObjects.discover.selectDataView(testData.DATA_VIEW.ECOMMERCE);
      await assertNoFilterAndEmptyQuery(filterFieldAndValue, pageObjects, page);

      // create new search again
      await pageObjects.discover.clickNewSearch();
      await assertDataViewIsSelected(page, testData.DATA_VIEW.ECOMMERCE);
    });
  }
);
