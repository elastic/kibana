/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Serverless test (remove during Scout migration): x-pack/platform/test/serverless/functional/test_suites/discover/x_pack_visualize_field/visualize_field.ts

/**
 * Migration recommendation: MIXED, and the largest file in this config (12 tests). The
 * Discover-to-Lens handoff is the contract worth keeping in a browser; the button-rendering test
 * is already a unit test, one ES|QL pair is a duplicate of the other, and the last two tests are
 * Lens dashboard inline-editing rather than Discover behavior.
 *
 * The serverless mirror listed above carries a subset (no ES|QL) and should be folded into the same
 * deployment-agnostic Scout specs rather than migrated separately.
 */

import expect from '@kbn/expect';
import type { DebugState } from '@elastic/charts';
import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const dataViews = getService('dataViews');
  const { common, discover, timePicker, lens, header, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'lens',
    'header',
    'unifiedFieldList',
  ]);
  const elasticChart = getService('elasticChart');
  const monacoEditor = getService('monacoEditor');
  const dashboardPanelActions = getService('dashboardPanelActions');

  const defaultSettings = {
    enableESQL: true,
  };

  async function setDiscoverTimeRange() {
    await timePicker.setDefaultAbsoluteRange();
  }

  function assertMatchesExpectedData(state: DebugState) {
    expect(state.legend?.items.map(({ name }) => name).sort()).to.eql([
      'css',
      'gif',
      'jpg',
      'php',
      'png',
    ]);
  }

  describe('discover field visualize button', () => {
    before(async () => {
      await kibanaServer.uiSettings.replace(defaultSettings);
      await esArchiver.loadIfNeeded(
        'x-pack/platform/test/fixtures/es_archives/logstash_functional'
      );
      await kibanaServer.importExport.load(
        'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json'
      );
    });

    beforeEach(async () => {
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await setDiscoverTimeRange();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
    });

    after(async () => {
      await timePicker.resetDefaultAbsoluteRangeViaUiSettings();
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/logstash_functional');
      await kibanaServer.importExport.unload(
        'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json'
      );
    });

    /**
     * Migration recommendation: DELETE. Whether the visualize action renders for a field is covered
     * by
     * src/platform/packages/shared/kbn-unified-field-list/src/components/field_visualize_button/field_visualize_button.test.tsx,
     * and the next test exercises the same button for real by clicking it.
     */
    it('shows "visualize" field button', async () => {
      await unifiedFieldList.clickFieldListItem('bytes');
      await unifiedFieldList.expectFieldListItemVisualize('bytes');
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. This is the core Discover-to-Lens handoff and
     * nothing below the browser asserts that the generated Lens state reaches the dimension editor.
     */
    it('visualizes field to Lens and loads fields to the dimension editor', async () => {
      await unifiedFieldList.findFieldByName('bytes');
      await unifiedFieldList.clickFieldListItemVisualize('bytes');
      await header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(2);
        expect(await dimensions[1].getVisibleText()).to.be('Median of bytes');
      });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT, merged with 'should preserve query in lens' into
     * one spec with two `test.step`s. Both assert the same thing — that Discover app state survives
     * the navigation — and each currently pays a full Discover load plus time-range setup.
     */
    it('should preserve app filters in lens', async () => {
      await filterBar.addFilter({
        field: 'bytes',
        operation: 'is between',
        value: { from: '3500', to: '4000' },
      });
      await unifiedFieldList.findFieldByName('geo.src');
      await unifiedFieldList.clickFieldListItemVisualize('geo.src');
      await header.waitUntilLoadingHasFinished();

      expect(await filterBar.hasFilter('bytes', '3,500 to 4,000')).to.be(true);
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT, merged with 'should preserve app filters in lens'.
     */
    it('should preserve query in lens', async () => {
      await queryBar.setQuery('machine.os : ios');
      await queryBar.submitQuery();
      await unifiedFieldList.findFieldByName('geo.dest');
      await unifiedFieldList.clickFieldListItemVisualize('geo.dest');
      await header.waitUntilLoadingHasFinished();

      expect(await queryBar.getQueryString()).to.equal('machine.os : ios');
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Editing the histogram breakdown in Lens is real
     * integration, but replace the `echLegendItem__label` class lookup with the Lens chart debug
     * state used elsewhere in this file — class-name selectors break on EUI upgrades.
     */
    it('should visualize correctly using breakdown field', async () => {
      await discover.chooseBreakdownField('extension.raw');
      await header.waitUntilLoadingHasFinished();
      await testSubjects.click('unifiedHistogramEditVisualization');
      await header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        const breakdownLabel = await testSubjects.find(
          'lnsDragDrop_domDraggable_Top 9 values of extension.raw'
        );

        const lnsWorkspace = await testSubjects.find('lnsWorkspace');
        const list = await lnsWorkspace.findAllByClassName('echLegendItem__label');
        const values = await Promise.all(
          list.map((elem: WebElementWrapper) => elem.getVisibleText())
        );

        expect(await breakdownLabel.getVisibleText()).to.eql('Top 9 values of extension.raw');
        // Shows all 5 extension types (no Other bucket since all values fit within top 9)
        expect(values).to.eql(['jpg', 'css', 'png', 'gif', 'php']);
      });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT. Ad hoc data views are not persisted, so carrying
     * one across the Discover-to-Lens boundary is exactly the kind of thing only a browser catches.
     */
    it('should visualize correctly using adhoc data view', async () => {
      await dataViews.createFromSearchBar({
        name: 'logst',
        adHoc: true,
        hasTimeField: true,
      });

      await testSubjects.click('unifiedHistogramEditVisualization');
      await header.waitUntilLoadingHasFinished();

      await dataViews.waitForSwitcherToBe('logst*');
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT, into
     * src/platform/plugins/shared/discover/test/scout/esql alongside the existing ES|QL specs.
     */
    it('should visualize correctly ES|QL queries in Discover', async () => {
      await discover.selectTextBaseLang();
      await header.waitUntilLoadingHasFinished();
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageB = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      expect(await testSubjects.exists('unifiedHistogramChart')).to.be(true);
      expect(await testSubjects.exists('xyVisChart')).to.be(true);

      await discover.chooseLensSuggestion('treemap');
      await header.waitUntilLoadingHasFinished();
      expect(await testSubjects.exists('partitionVisChart')).to.be(true);
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT, but under Lens ownership. Removing and
     * reconfiguring dimensions in the edit flyout is Lens behavior; it belongs with
     * x-pack/platform/plugins/shared/lens/test/scout/core/ui/parallel_tests rather than in a
     * Discover suite.
     */
    it('should allow changing dimensions', async () => {
      await elasticChart.setNewChartUiDebugFlag(true);
      await discover.selectTextBaseLang();
      await header.waitUntilLoadingHasFinished();
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageB = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();

      await testSubjects.click('unifiedHistogramEditFlyoutVisualization');
      expect(await testSubjects.exists('xyVisChart')).to.be(true);
      expect(await lens.canRemoveDimension('lnsXY_xDimensionPanel')).to.equal(true);
      await lens.removeDimension('lnsXY_xDimensionPanel');
      await header.waitUntilLoadingHasFinished();
      await lens.configureTextBasedLanguagesDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        field: 'extension',
      });
      await header.waitUntilLoadingHasFinished();
      const data = await lens.getCurrentChartDebugStateForVizType('xyVisChart');
      assertMatchesExpectedData(data!);
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT, and collapse with the test below. The two differ
     * only in `from logstash-*` vs `from logstash*`; keep one and assert both index expressions in
     * a single spec if the glob variant is worth covering at all.
     */
    it('should visualize correctly ES|QL queries in Lens', async () => {
      await discover.selectTextBaseLang();
      await header.waitUntilLoadingHasFinished();
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageB = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      await testSubjects.click('unifiedHistogramEditFlyoutVisualization');

      await header.waitUntilLoadingHasFinished();

      await retry.waitFor('lens flyout', async () => {
        const dimensions = await testSubjects.findAll('lns-dimensionTrigger-textBased');
        return dimensions.length === 2 && (await dimensions[1].getVisibleText()) === 'averageB';
      });
    });

    /**
     * Migration recommendation: DELETE. Duplicate of the test above apart from the index glob.
     */
    it('should visualize correctly ES|QL queries based on index patterns', async () => {
      await discover.selectTextBaseLang();
      await header.waitUntilLoadingHasFinished();
      await monacoEditor.setCodeEditorValue(
        'from logstash* | stats averageB = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      await testSubjects.click('unifiedHistogramEditFlyoutVisualization');

      await header.waitUntilLoadingHasFinished();

      await retry.waitFor('lens flyout', async () => {
        const dimensions = await testSubjects.findAll('lns-dimensionTrigger-textBased');
        return dimensions.length === 2 && (await dimensions[1].getVisibleText()) === 'averageB';
      });
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT, but under Lens ownership and deduplicated against
     * x-pack/platform/plugins/shared/lens/test/scout/core/ui/parallel_tests/esql_dashboard_inline_editing.spec.ts,
     * which already covers ES|QL inline editing on a dashboard. What is unique here is the entry
     * point — saving the Discover histogram visualization straight into a new dashboard — so keep
     * that leg and drop the dimension reconfiguration that follows.
     */
    it('should save and edit chart in the dashboard on the fly', async () => {
      await discover.selectTextBaseLang();
      await header.waitUntilLoadingHasFinished();
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageB = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      await testSubjects.click('unifiedHistogramSaveVisualization');
      await header.waitUntilLoadingHasFinished();

      await lens.saveModal('TextBasedChart', false, false, false, 'new');
      await testSubjects.existOrFail('embeddablePanelHeading-TextBasedChart');
      await elasticChart.setNewChartUiDebugFlag(true);
      await header.waitUntilLoadingHasFinished();
      await dashboardPanelActions.clickInlineEdit();
      await header.waitUntilLoadingHasFinished();
      expect(await lens.canRemoveDimension('lnsXY_xDimensionPanel')).to.equal(true);
      await lens.removeDimension('lnsXY_xDimensionPanel');
      await header.waitUntilLoadingHasFinished();
      await lens.configureTextBasedLanguagesDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        field: 'extension',
      });
      await header.waitUntilLoadingHasFinished();
      const data = await lens.getCurrentChartDebugStateForVizType('xyVisChart');
      assertMatchesExpectedData(data!);
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT, under Lens ownership and deduplicated against
     * esql_dashboard_inline_editing.spec.ts. The nine-iteration `removeDimension` loop and the
     * suggestion-panel walk are Lens editor mechanics, not Discover integration, and are the
     * slowest thing in this config.
     */
    it('should allow editing the query in the dashboard', async () => {
      await discover.selectTextBaseLang();
      await header.waitUntilLoadingHasFinished();
      await monacoEditor.setCodeEditorValue('from logstash-* | limit 10');
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      // save the visualization
      await testSubjects.click('unifiedHistogramSaveVisualization');
      await header.waitUntilLoadingHasFinished();
      await lens.saveModal('TextBasedChart1', false, false, false, 'new');
      await testSubjects.existOrFail('embeddablePanelHeading-TextBasedChart1');
      await elasticChart.setNewChartUiDebugFlag(true);
      await header.waitUntilLoadingHasFinished();
      // open the inline editing flyout
      await dashboardPanelActions.clickInlineEdit();
      await header.waitUntilLoadingHasFinished();

      // change the query
      await monacoEditor.setCodeEditorValue('from logstash-* | stats maxB = max(bytes)');
      await testSubjects.click('ESQLEditor-run-query-button');
      await header.waitUntilLoadingHasFinished();

      expect((await lens.getMetricVisualizationData()).length).to.be.equal(1);

      // change the query to display a datatabler
      await monacoEditor.setCodeEditorValue('from logstash-* | limit 10');
      await testSubjects.click('ESQLEditor-run-query-button');
      await lens.waitForVisualization();
      expect(await testSubjects.exists('lnsDataTable')).to.be(true);

      // Removing all except one columns one
      let count = 9;
      while (count-- > 0) {
        await lens.removeDimension('lnsDatatable_metrics');
      }

      await lens.configureTextBasedLanguagesDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        field: 'bytes',
        keepOpen: true,
      });
      await testSubjects.click('lns-indexPattern-dimensionContainerBack');
      // click pie from suggestions
      await testSubjects.click('lensSuggestionsPanelToggleButton');
      await testSubjects.click('lnsSuggestion-pie');
      expect(await testSubjects.exists('partitionVisChart')).to.be(true);
    });
  });
}
