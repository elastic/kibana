/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { range } from 'lodash';
import { NULL_LABEL } from '@kbn/field-formats-common';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header', 'svlCommonPage']);
  const find = getService('find');
  const listingTable = getService('listingTable');
  const filterBar = getService('filterBar');
  const config = getService('config');

  describe('lens smokescreen tests (part 2)', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginWithPrivilegedRole();
    });

    it('should transition from bar chart to line chart', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('line');
      expect(await PageObjects.lens.getTitle()).to.eql('lnsXYvis');
      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
        '@timestamp'
      );
      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Average of bytes'
      );
      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_splitDimensionPanel')).to.eql(
        'Top 3 values of ip'
      );
    });

    it('should transition from pie chart to treemap chart', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsPieVis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsPieVis');
      await PageObjects.lens.goToTimeRange();
      expect(await PageObjects.lens.hasChartSwitchWarning('treemap')).to.eql(false);
      await PageObjects.lens.switchToVisualization('treemap');
      expect(
        await PageObjects.lens.getDimensionTriggersTexts('lnsPie_groupByDimensionPanel')
      ).to.eql(['Top 7 values of geo.dest', 'Top 3 values of geo.src']);
      expect(await PageObjects.lens.getDimensionTriggerText('lnsPie_sizeByDimensionPanel')).to.eql(
        'Average of bytes'
      );
    });

    it('should create a pie chart and switch to datatable', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('pie');
      await PageObjects.lens.configureDimension({
        dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
        disableEmptyRows: true,
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsPie_sizeByDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      expect(await PageObjects.lens.hasChartSwitchWarning('lnsDatatable')).to.eql(false);
      await PageObjects.lens.switchToVisualization('lnsDatatable');

      expect(await PageObjects.lens.getDatatableHeaderText()).to.eql('@timestamp per 3 hours');
      expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('2015-09-20 00:00');
      expect(await PageObjects.lens.getDatatableHeaderText(1)).to.eql('Average of bytes');
      expect(await PageObjects.lens.getDatatableCellText(0, 1)).to.eql('6,011.351');
    });

    it('should create a heatmap chart and transition to barchart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('heatmap', 'heat');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsHeatmap_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsHeatmap_yDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.dest',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsHeatmap_cellPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      expect(await PageObjects.lens.hasChartSwitchWarning('bar')).to.eql(false);
      await PageObjects.lens.switchToVisualization('bar');
      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
        '@timestamp'
      );
      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Average of bytes'
      );
    });

    it('should create a valid XY chart with references', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'moving_average',
        keepOpen: true,
      });
      await PageObjects.lens.configureReference({
        operation: 'sum',
        field: 'bytes',
      });
      await PageObjects.lens.closeDimensionEditor();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'cumulative_sum',
        keepOpen: true,
      });
      await PageObjects.lens.configureReference({
        field: 'Records',
      });
      await PageObjects.lens.closeDimensionEditor();

      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(2);
    });

    it('should allow formatting on references', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('lnsDatatable');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_rows > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
        disableEmptyRows: true,
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'moving_average',
        keepOpen: true,
      });
      await PageObjects.lens.configureReference({
        operation: 'sum',
        field: 'bytes',
      });
      await PageObjects.lens.editDimensionFormat('Number');
      await PageObjects.lens.closeDimensionEditor();

      await PageObjects.lens.waitForVisualization();

      const values = await Promise.all(
        range(0, 6).map((index) => PageObjects.lens.getDatatableCellText(index, 1))
      );
      expect(values).to.eql([
        NULL_LABEL,
        '222,420.00',
        '702,050.00',
        '1,879,613.33',
        '3,482,256.25',
        '4,359,953.00',
      ]);
    });

    it('should handle edge cases in reference-based operations', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'cumulative_sum',
      });
      expect(await PageObjects.lens.getWorkspaceErrorCount()).to.eql(1);

      await PageObjects.lens.removeDimension('lnsXY_xDimensionPanel');
      expect(await PageObjects.lens.getWorkspaceErrorCount()).to.eql(2);

      await PageObjects.lens.dragFieldToDimensionTrigger(
        '@timestamp',
        'lnsXY_xDimensionPanel > lns-empty-dimension'
      );
      expect(await PageObjects.lens.getWorkspaceErrorCount()).to.eql(1);

      expect(await PageObjects.lens.hasChartSwitchWarning('lnsDatatable')).to.eql(false);
      await PageObjects.lens.switchToVisualization('lnsDatatable');

      expect(await PageObjects.lens.getDimensionTriggerText('lnsDatatable_metrics')).to.eql(
        'Cumulative sum of (incomplete)'
      );
    });

    it('should keep the field selection while transitioning to every reference-based operation', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'counter_rate',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'cumulative_sum',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'differences',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'moving_average',
      });

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Moving average of Sum of bytes'
      );
    });

    it('should not leave an incomplete column in the visualization config with field-based operation', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'min',
      });

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        undefined
      );
    });

    it('should revert to previous configuration and not leave an incomplete column in the visualization config with reference-based operations', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'moving_average',
        field: 'Records',
      });

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Moving average of Count of records'
      );

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'median',
        isPreviousIncompatible: true,
        keepOpen: true,
      });

      expect(await PageObjects.lens.isDimensionEditorOpen()).to.eql(true);

      await PageObjects.lens.closeDimensionEditor();

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Moving average of Count of records'
      );
    });

    it('should transition from unique count to last value', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'unique_count',
        field: 'ip',
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'last_value',
        field: 'bytes',
        isPreviousIncompatible: true,
      });

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Last value of bytes'
      );
    });

    it('should allow to change index pattern', async () => {
      let indexPatternString: string;
      if (config.get('esTestCluster.ccs')) {
        indexPatternString = 'ftr-remote:log*';
      } else {
        indexPatternString = 'log*';
      }
      await PageObjects.lens.switchFirstLayerIndexPattern(indexPatternString);
      expect(await PageObjects.lens.getFirstLayerIndexPattern()).to.equal(indexPatternString);
    });

    it('should allow filtering by legend on an xy chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'extension.raw',
      });

      await PageObjects.lens.filterLegend('jpg');
      const hasExtensionFilter = await filterBar.hasFilter('extension.raw', 'jpg');
      expect(hasExtensionFilter).to.be(true);

      await filterBar.removeFilter('extension.raw');
    });

    it('should allow filtering by legend on a pie chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('pie');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'extension.raw',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'agent.raw',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsPie_sizeByDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.filterLegend('jpg');
      const hasExtensionFilter = await filterBar.hasFilter('extension.raw', 'jpg');
      expect(hasExtensionFilter).to.be(true);

      await filterBar.removeFilter('extension.raw');
    });

    it('should show visual options button group for a pie chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.switchToVisualization('pie');

      await PageObjects.lens.openStyleSettingsFlyout();

      const donutHole = await PageObjects.lens.getDonutHoleSize();
      expect(donutHole).to.be('None');

      await PageObjects.lens.closeFlyoutWithBackButton();
    });

    it('switches donut hole size', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.switchToVisualization('pie');
      await PageObjects.lens.setDonutHoleSize('Small');
      const donutHole = await PageObjects.lens.getDonutHoleSize();
      expect(donutHole).to.be('Small');
    });
  });
}
