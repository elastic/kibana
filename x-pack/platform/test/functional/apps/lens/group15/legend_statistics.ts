/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens } = getPageObjects(['visualize', 'lens']);
  const find = getService('find');
  const listingTable = getService('listingTable');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  async function loadSavedLens(title: string) {
    await visualize.gotoVisualizationLandingPage();
    await listingTable.searchForItemWithName(title);
    await lens.clickVisualizeListItemTitle(title);
  }

  async function expectLegendOneItem(name: string, value?: string) {
    const expectedText = value ? `${name}\n${value}` : name;
    const legendElement = await find.byCssSelector('.echLegendItem');
    const text = await legendElement.getVisibleText();
    expect(text).to.eql(expectedText);
  }
  async function expectLegendTableToHaveText(expectedText: string, layout: string = 'Table') {
    const legendElement = await find.byCssSelector(`.echLegend${layout}`);
    const text = await legendElement.getVisibleText();
    expect(text).to.eql(expectedText);
  }

  async function setLegendPositionTop() {
    await testSubjects.click('lens-legend-position-btn-top');
  }

  async function selectGridLayout() {
    await testSubjects.click('legend_layout_grid');
  }

  async function expectGridTruncationInput() {
    await testSubjects.existOrFail('lens-legend-max-lines-input');
    await testSubjects.missingOrFail('lens-legend-width-limit-input');
  }

  async function expectNoTruncationInput() {
    await testSubjects.missingOrFail('lens-legend-max-lines-input');
    await testSubjects.missingOrFail('lens-legend-truncate-switch');
  }

  async function expectLegendListFormat() {
    await retry.try(async () => {
      expect(await find.existsByCssSelector('.echLegendTable')).to.be(false);
      expect(await find.existsByCssSelector('.echLegendList')).to.be(true);
    });
  }

  describe('lens legend statistics', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/platform/test/functional/fixtures/kbn_archives/lens/legend_statistics'
      );
      await kibanaServer.importExport.load(
        'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json'
      );
      await kibanaServer.importExport.load(
        'x-pack/platform/test/functional/fixtures/kbn_archives/lens/default'
      );
      await kibanaServer.uiSettings.update({
        'timepicker:timeDefaults':
          '{  "from": "2015-09-18T19:37:13.000Z",  "to": "2015-09-22T23:30:30.000Z"}',
      });
      await visualize.gotoVisualizationLandingPage({ forceRefresh: true });
    });

    describe('xy chart legend statistics', () => {
      it('shows table with legend statistics', async () => {
        await loadSavedLens('lnsXYvis');

        await lens.openLegendSettingsFlyout();
        await setLegendPositionTop();
        await lens.selectOptionFromComboBox('lnsLegendStatisticsSelect', [
          'average',
          'minimum',
          'maximum',
        ]);
        await selectGridLayout();
        await expectGridTruncationInput();
        await lens.closeFlyoutWithBackButton();

        const tableText = `Avg
Min
Max
97.220.3.248
19,755
19,755
19,755
169.228.188.120
18,994
18,994
18,994
78.83.247.30
17,246
17,246
17,246`;

        await expectLegendTableToHaveText(tableText);
      });

      it('shows list layout with no truncation option', async () => {
        await lens.openLegendSettingsFlyout();
        await setLegendPositionTop();
        await expectNoTruncationInput();
        await lens.closeFlyoutWithBackButton();

        await expectLegendListFormat();
        const listText = `97.220.3.248
AVG: 19,755MIN: 19,755
MAX: 19,755
169.228.188.120
AVG: 18,994MIN: 18,994
MAX: 18,994
78.83.247.30
AVG: 17,246MIN: 17,246
MAX: 17,246`;

        await expectLegendTableToHaveText(listText, 'List');
      });
    });
    describe('lens persisted and runtime state differences properties', () => {
      after(async () => {
        await kibanaServer.uiSettings.unset('timepicker:timeDefaults');
      });
      describe('xy chart', () => {
        it('shows values in legend for legacy valuesInLegend===true property and saves it correctly', async () => {
          const title = 'xyValuesInLegendTrue';
          await loadSavedLens(title);
          await expectLegendOneItem('Count of records', '2');
          await lens.save(title);
          await loadSavedLens(title);
          await expectLegendOneItem('Count of records', '2');
        });

        it('does not show values in legend for legacy valuesInLegend===false prop', async () => {
          await loadSavedLens('xyValuesInLegendFalse');
          await expectLegendOneItem('Count of records');
        });
        it('shows values in legend for legendStats===["values"] prop', async () => {
          await loadSavedLens('xyLegendStats');
          await expectLegendOneItem('Count of records', '2');
        });
      });
      describe('waffle chart', () => {
        it('waffleshows values in legend for legacy valuesInLegend===true property', async () => {
          await loadSavedLens('waffleValuesInLegendTrue');
          await expectLegendOneItem('Count of records', '14,003');
        });
        it('shows values in legend for legacy showValuesInLegend===false prop', async () => {
          await loadSavedLens('waffleValuesInLegendFalse');
          await expectLegendOneItem('Count of records', undefined);
        });
        it('shows values in legend for legendStats===["values"] prop', async () => {
          await loadSavedLens('waffleLegendStats');
          await expectLegendOneItem('Count of records', '14,003');
        });
      });
    });
  });
}
