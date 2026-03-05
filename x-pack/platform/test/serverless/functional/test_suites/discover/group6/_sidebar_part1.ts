/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects([
    'common',
    'svlCommonPage',
    'discover',
    'timePicker',
    'header',
    'unifiedFieldList',
  ]);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const filterBar = getService('filterBar');
  const retry = getService('retry');
  const queryBar = getService('queryBar');
  const log = getService('log');
  const INITIAL_FIELD_LIST_SUMMARY = '48 available fields. 5 empty fields. 4 meta fields.';

  const expectFieldListDescription = async (expectedNumber: string) => {
    return await retry.try(async () => {
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
      const ariaDescription = await PageObjects.unifiedFieldList.getSidebarAriaDescription();
      if (ariaDescription !== expectedNumber) {
        log.warning(
          `Expected Sidebar Aria Description: ${expectedNumber}, got: ${ariaDescription}`
        );
        await queryBar.submitQuery();
      }
      expect(ariaDescription).to.be(expectedNumber);
    });
  };

  describe('discover sidebar (part 1)', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await PageObjects.svlCommonPage.loginAsAdmin();
    });

    beforeEach(async () => {
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    afterEach(async () => {
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
      await PageObjects.unifiedFieldList.cleanSidebarLocalStorage();
    });

    describe('field filtering', function () {
      it('should reveal and hide the filter form when the toggle is clicked', async function () {
        await PageObjects.unifiedFieldList.openSidebarFieldFilter();
        await PageObjects.unifiedFieldList.closeSidebarFieldFilter();
      });

      it('should filter by field type', async function () {
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
        await PageObjects.unifiedFieldList.openSidebarFieldFilter();

        await expectFieldListDescription(INITIAL_FIELD_LIST_SUMMARY);

        await testSubjects.click('typeFilter-keyword');
        // first update
        await expectFieldListDescription('6 available fields. 1 empty field. 3 meta fields.');

        await testSubjects.click('typeFilter-number');

        // second update
        await expectFieldListDescription('10 available fields. 3 empty fields. 4 meta fields.');

        await testSubjects.click('fieldListFiltersFieldTypeFilterClearAll');

        // reset
        await expectFieldListDescription(INITIAL_FIELD_LIST_SUMMARY);
      });

      // TODO: ES|QL tests removed since ES|QL isn't supported in Serverless
    });

    describe('search', function () {
      beforeEach(async () => {
        await expectFieldListDescription(INITIAL_FIELD_LIST_SUMMARY);
      });

      afterEach(async () => {
        const fieldSearch = await testSubjects.find('clearSearchButton');
        await fieldSearch.click();

        // reset
        await expectFieldListDescription(INITIAL_FIELD_LIST_SUMMARY);
      });

      it('should be able to search by string', async function () {
        await PageObjects.unifiedFieldList.findFieldByName('i');

        await expectFieldListDescription('28 available fields. 2 empty fields. 3 meta fields.');
        await PageObjects.unifiedFieldList.findFieldByName('p');
        await expectFieldListDescription('4 available fields. 0 meta fields.');

        expect(
          (await PageObjects.unifiedFieldList.getSidebarSectionFieldNames('available')).join(', ')
        ).to.be('clientip, ip, relatedContent.og:description, relatedContent.twitter:description');
      });

      it('should be able to search by wildcard', async function () {
        await PageObjects.unifiedFieldList.findFieldByName('relatedContent*image');
        await expectFieldListDescription('2 available fields. 0 meta fields.');

        expect(
          (await PageObjects.unifiedFieldList.getSidebarSectionFieldNames('available')).join(', ')
        ).to.be('relatedContent.og:image, relatedContent.twitter:image');
      });

      it('should be able to search with spaces as wildcard', async function () {
        await PageObjects.unifiedFieldList.findFieldByName('relatedContent image');

        await expectFieldListDescription('4 available fields. 0 meta fields.');

        expect(
          (await PageObjects.unifiedFieldList.getSidebarSectionFieldNames('available')).join(', ')
        ).to.be(
          'relatedContent.og:image, relatedContent.og:image:height, relatedContent.og:image:width, relatedContent.twitter:image'
        );
      });

      it('should be able to search with fuzzy search (1 typo)', async function () {
        await PageObjects.unifiedFieldList.findFieldByName('rel4tedContent.art');
        await expectFieldListDescription('4 available fields. 0 meta fields.');

        expect(
          (await PageObjects.unifiedFieldList.getSidebarSectionFieldNames('available')).join(', ')
        ).to.be(
          'relatedContent.article:modified_time, relatedContent.article:published_time, relatedContent.article:section, relatedContent.article:tag'
        );
      });

      it('should ignore empty search', async function () {
        await PageObjects.unifiedFieldList.findFieldByName('   '); // only spaces

        await retry.waitFor('the clear button', async () => {
          return await testSubjects.exists('clearSearchButton');
        });

        // expect no changes in the list
        await expectFieldListDescription(INITIAL_FIELD_LIST_SUMMARY);
      });
    });

    describe('field stats', function () {
      it('should work for regular and pinned filters', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();

        const allTermsResult = 'jpg\n65.0%\ncss\n15.4%\npng\n9.8%\ngif\n6.6%\nphp\n3.2%';
        await PageObjects.unifiedFieldList.clickFieldListItem('extension');
        expect(await testSubjects.getVisibleText('dscFieldStats-topValues')).to.be(allTermsResult);

        await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'jpg' });
        await PageObjects.header.waitUntilLoadingHasFinished();

        const onlyJpgResult = 'jpg\n100%';
        await PageObjects.unifiedFieldList.clickFieldListItem('extension');
        expect(await testSubjects.getVisibleText('dscFieldStats-topValues')).to.be(onlyJpgResult);

        await filterBar.toggleFilterNegated('extension');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const jpgExcludedResult = 'css\n44.1%\npng\n28.0%\ngif\n18.8%\nphp\n9.1%';
        await PageObjects.unifiedFieldList.clickFieldListItem('extension');
        expect(await testSubjects.getVisibleText('dscFieldStats-topValues')).to.be(
          jpgExcludedResult
        );

        await filterBar.toggleFilterPinned('extension');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.unifiedFieldList.clickFieldListItem('extension');
        expect(await testSubjects.getVisibleText('dscFieldStats-topValues')).to.be(
          jpgExcludedResult
        );

        await browser.refresh();

        await PageObjects.unifiedFieldList.clickFieldListItem('extension');
        expect(await testSubjects.getVisibleText('dscFieldStats-topValues')).to.be(
          jpgExcludedResult
        );

        await filterBar.toggleFilterEnabled('extension');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.unifiedFieldList.clickFieldListItem('extension');
        expect(await testSubjects.getVisibleText('dscFieldStats-topValues')).to.be(allTermsResult);
      });
    });

    describe('collapse expand', function () {
      it('should initially be expanded', async function () {
        await testSubjects.existOrFail('discover-sidebar');
        await testSubjects.existOrFail('fieldList');
      });

      it('should collapse when clicked', async function () {
        await PageObjects.discover.closeSidebar();
        await testSubjects.existOrFail('dscShowSidebarButton');
        await testSubjects.missingOrFail('fieldList');
      });

      it('should expand when clicked', async function () {
        await PageObjects.discover.openSidebar();
        await testSubjects.existOrFail('discover-sidebar');
        await testSubjects.existOrFail('fieldList');
      });
    });
  });
}
