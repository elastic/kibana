/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const dataGrid = getService('dataGrid');
  const monacoEditor = getService('monacoEditor');
  const aiops = getService('aiops');
  const browser = getService('browser');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const { common, discover, header, timePicker, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'header',
    'timePicker',
    'unifiedFieldList',
  ]);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  async function retrySwitchTab(tabIndex: number, seconds: number) {
    await retry.tryForTime(seconds * 1000, async () => {
      await browser.switchTab(tabIndex);
    });
  }

  describe('log pattern analysis ES|QL in discover', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.uiSettings.replace(defaultSettings);
      await common.navigateToApp('discover');
      await timePicker.setDefaultAbsoluteRange();
      await discover.waitUntilSearchingHasFinished();
      await discover.selectTextBaseLang();
      await discover.waitUntilSearchingHasFinished();
    });

    beforeEach(async () => {
      await discover.clickNewSearchButton();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
    });

    let tabsCount = 1;

    afterEach(async () => {
      if (tabsCount > 1) {
        await browser.closeCurrentWindow();
        await retrySwitchTab(0, 10);
        tabsCount--;
      }
    });

    it('should render categorize fields correctly', async () => {
      // set query to be categorize command
      // ensure the columns are correct
      await monacoEditor.setCodeEditorValue(
        'from logstash-*\n  | STATS Count=COUNT(*) BY Pattern=CATEGORIZE(@message)\n | SORT Count DESC'
      );
      await testSubjects.click('querySubmitButton');
      const columns = ['Count', 'Pattern'];
      await unifiedFieldList.clickFieldListItemAdd('Count');
      await unifiedFieldList.clickFieldListItemAdd('Pattern');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(columns);

      // refresh the table and ensure the columns are still correct
      await browser.refresh();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(columns);

      // get the first pattern cell and ensure it has the correct number of tokens
      const cell = await dataGrid.getCellElement(0, 3);
      const tokens = await cell.findAllByCssSelector('.unifiedDataTable__cellValue code');

      expect(tokens.length).to.be.greaterThan(0);

      // click the expand action button in the cell
      // ensure the popover is displayed and the regex is correct
      await dataGrid.clickCellExpandButton(0, { columnIndex: 3, columnName: 'Pattern' });

      const regexElement = await testSubjects.find('euiDataGridExpansionPopover-patternRegex');
      const regexText = await regexElement.getVisibleText();
      // The pattern might change based on the data, so rather than checking for an exact match,
      // we check that the string contains part of a regex
      expect(regexText).to.contain('.*?');

      // Click the view docs in Discover button
      // ensure it opens a new tab and the discover doc count is greater than 0
      // We cannot look for an exact count as the count may vary based on sampling (when that is added)
      await dataGrid.clickCellExpandPopoverAction('patterns-action-view-docs-in-discover');
      await retrySwitchTab(1, 10);
      tabsCount++;

      await aiops.logPatternAnalysisPage.assertDiscoverDocCountExists();
      // ensure the discover doc count is greater than 0
      await aiops.logPatternAnalysisPage.assertDiscoverDocCountGreaterThan(0);
    });
  });
}
