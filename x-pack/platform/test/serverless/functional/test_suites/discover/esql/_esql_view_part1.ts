/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { NULL_LABEL } from '@kbn/field-formats-common';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');
  const PageObjects = getPageObjects([
    'svlCommonPage',
    'common',
    'discover',
    'header',
    'timePicker',
    'unifiedFieldList',
  ]);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover esql view (part 1)', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      log.debug('load kibana index with default index pattern');
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await esArchiver.load(
        'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_flights'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.svlCommonPage.loginAsAdmin();
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilTabIsLoaded();
    });

    after(async () => {
      await PageObjects.timePicker.resetDefaultAbsoluteRangeViaUiSettings();
    });

    describe('ES|QL in Discover', () => {
      beforeEach(async () => {
        await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.discover.waitUntilTabIsLoaded();
      });

      it('should render esql view correctly', async function () {
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

        await testSubjects.existOrFail('showQueryBarMenu');
        await testSubjects.existOrFail('superDatePickerToggleQuickMenuButton');
        await testSubjects.existOrFail('addFilter');
        await testSubjects.existOrFail('dscViewModeDocumentButton');
        await testSubjects.existOrFail('unifiedHistogramChart');
        await testSubjects.existOrFail('discoverQueryHits');
        await testSubjects.click('app-menu-overflow-button');
        await testSubjects.existOrFail('discoverAlertsButton');
        await testSubjects.click('app-menu-overflow-button');
        await testSubjects.existOrFail('shareTopNavButton');
        await testSubjects.existOrFail('docTableExpandToggleColumn');
        await testSubjects.existOrFail('dataGridColumnSortingButton');
        await testSubjects.existOrFail('fieldListFiltersFieldSearch');
        await testSubjects.existOrFail('fieldListFiltersFieldTypeFilterToggle');
        await testSubjects.click('field-@message-showDetails');
        await testSubjects.existOrFail('discoverFieldListPanelEdit-@message');

        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.discover.waitUntilTabIsLoaded();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

        await testSubjects.existOrFail('fieldListFiltersFieldSearch');
        await testSubjects.existOrFail('ESQLEditor');
        await testSubjects.existOrFail('superDatePickerToggleQuickMenuButton');

        await testSubjects.missingOrFail('showQueryBarMenu');
        await testSubjects.missingOrFail('addFilter');
        await testSubjects.missingOrFail('dscViewModeToggle');
        await testSubjects.missingOrFail('dscViewModeDocumentButton');
        await testSubjects.existOrFail('unifiedHistogramChart');
        await testSubjects.existOrFail('discoverQueryHits');
        await testSubjects.click('app-menu-overflow-button');
        await testSubjects.existOrFail('discoverAlertsButton');
        await testSubjects.click('app-menu-overflow-button');
        await testSubjects.existOrFail('shareTopNavButton');
        await testSubjects.missingOrFail('dataGridColumnSortingButton');
        await testSubjects.existOrFail('docTableExpandToggleColumn');
        await testSubjects.existOrFail('fieldListFiltersFieldTypeFilterToggle');
        await testSubjects.click('field-@message-showDetails');
        await testSubjects.missingOrFail('discoverFieldListPanelEditItem');
      });

      it('should not render the histogram for indices with no @timestamp field', async function () {
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.discover.waitUntilTabIsLoaded();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

        const testQuery = `from kibana_sample_data_flights | limit 10`;

        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.discover.waitUntilTabIsLoaded();

        expect(await testSubjects.exists('ESQLEditor')).to.be(true);
        expect(await testSubjects.exists('unifiedHistogramChart')).to.be(false);
      });

      it('should render the histogram for indices with no @timestamp field when the ?_tstart, ?_tend params are in the query', async function () {
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.discover.waitUntilTabIsLoaded();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

        const testQuery = `from kibana_sample_data_flights | limit 10 | where timestamp >= ?_tstart and timestamp <= ?_tend`;

        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.discover.waitUntilTabIsLoaded();

        const fromTime = 'Apr 10, 2018 @ 00:00:00.000';
        const toTime = 'Nov 15, 2018 @ 00:00:00.000';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.discover.waitUntilTabIsLoaded();

        expect(await testSubjects.exists('ESQLEditor')).to.be(true);
        expect(await testSubjects.exists('unifiedHistogramChart')).to.be(true);
      });

      it('should perform test query correctly', async function () {
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.discover.waitUntilTabIsLoaded();
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.discover.waitUntilTabIsLoaded();
        const testQuery = `from logstash-* | sort @timestamp | limit 10 | stats countB = count(bytes) by geo.dest | sort countB`;

        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.discover.waitUntilTabIsLoaded();
        await testSubjects.existOrFail('unifiedHistogramChart');
        await testSubjects.existOrFail('xyVisChart');
        const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        expect(await cell.getVisibleText()).to.be('1');
      });

      it('should render when switching to a time range with no data, then back to a time range with data', async () => {
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.discover.waitUntilTabIsLoaded();

        const testQuery = `from logstash-* | sort @timestamp | limit 10 | stats countB = count(bytes) by geo.dest | sort countB`;
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.discover.waitUntilTabIsLoaded();
        let cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        expect(await cell.getVisibleText()).to.be('1');
        await PageObjects.timePicker.setAbsoluteRange(
          'Sep 19, 2015 @ 06:31:44.000',
          'Sep 19, 2015 @ 06:31:44.000'
        );
        await PageObjects.discover.waitUntilTabIsLoaded();
        await testSubjects.existOrFail('discoverNoResults');
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.discover.waitUntilTabIsLoaded();
        cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        expect(await cell.getVisibleText()).to.be('1');
      });

      it('should query an index pattern that doesnt translate to a dataview correctly', async function () {
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.discover.waitUntilTabIsLoaded();

        const testQuery = `from logstash* | sort @timestamp | limit 10 | stats countB = count(bytes) by geo.dest | sort countB`;
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.discover.waitUntilTabIsLoaded();

        const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        expect(await cell.getVisibleText()).to.be('1');
      });

      it('should render correctly if there are empty fields', async function () {
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.discover.waitUntilTabIsLoaded();
        const testQuery = `from logstash-* | limit 10 | keep machine.ram_range, bytes`;

        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.discover.waitUntilTabIsLoaded();
        const cell = await dataGrid.getCellElementExcludingControlColumns(0, 1);
        expect(await cell.getVisibleText()).to.be(NULL_LABEL);
        expect((await dataGrid.getHeaders()).slice(-2)).to.eql([
          'Numberbytes',
          'machine.ram_range',
        ]);
      });

      it('should work without a FROM statement', async function () {
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.discover.waitUntilTabIsLoaded();
        const testQuery = `ROW a = 1, b = "two", c = null`;

        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.discover.waitUntilTabIsLoaded();

        await PageObjects.discover.dragFieldToTable('a');
        const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        expect(await cell.getVisibleText()).to.be('1');
      });
    });

    describe('errors', () => {
      it('should show error messages for syntax errors in query', async function () {
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.discover.waitUntilTabIsLoaded();

        const brokenQueries = [
          'from logstash-* | limit 10*',
          'from logstash-* | limit A',
          'from logstash-* | where a*',
          'limit 10',
        ];
        for (const testQuery of brokenQueries) {
          await monacoEditor.setCodeEditorValue(testQuery);
          await testSubjects.click('querySubmitButton');
          await PageObjects.discover.waitUntilTabIsLoaded();
          await PageObjects.discover.showsErrorCallout();
          const message = await testSubjects.getVisibleText('discoverErrorCalloutMessage');
          expect(message).to.contain(
            "[esql] > Couldn't parse Elasticsearch ES|QL query. Check your query and try again."
          );
          expect(message).to.not.contain('undefined');
          if (message.includes('line')) {
            expect((await monacoEditor.getCurrentMarkers('kibanaCodeEditor')).length).to.eql(1);
          }
        }
      });
    });
  });
}
