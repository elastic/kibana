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
  const testSubjects = getService('testSubjects');
  const elasticChart = getService('elasticChart');
  const filterBar = getService('filterBar');
  const retry = getService('retry');

  // Add tests here for chart appearance and interaction controls that do not
  // fundamentally change the data configuration, such as axes, labels, points, or legends.
  describe('lens chart style settings', () => {
    it('should allow creation of a multi-axis chart and switching multiple times', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await elasticChart.setNewChartUiDebugFlag(true);

      await lens.switchToVisualization('bar');

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.dest',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'unique_count',
        field: 'bytes',
        keepOpen: true,
      });

      await lens.changeAxisSide('right');
      let data = await lens.getCurrentChartDebugState('xyVisChart');
      expect(data?.axes?.y.length).to.eql(2);
      expect(data?.axes?.y.some(({ position }) => position === 'right')).to.eql(true);

      await lens.changeAxisSide('left');
      data = await lens.getCurrentChartDebugState('xyVisChart');
      expect(data?.axes?.y.length).to.eql(1);
      expect(data?.axes?.y.some(({ position }) => position === 'right')).to.eql(false);

      await lens.changeAxisSide('right');
      await lens.waitForVisualization('xyVisChart');

      await lens.closeDimensionEditor();
    });

    it('should show value labels on bar charts when enabled', async () => {
      // enable value labels
      await lens.openStyleSettingsFlyout();
      await testSubjects.click('lns_valueLabels_inside');
      await lens.closeFlyoutWithBackButton();

      // check for value labels
      const data = await lens.getCurrentChartDebugState('xyVisChart');
      expect(data?.bars?.[0].labels).not.to.eql(0);
    });

    it('should override axis title', async () => {
      const axisTitle = 'overridden axis';
      await lens.openStyleSettingsFlyout();
      await testSubjects.setValue('lnsyLeftAxisTitle', axisTitle, {
        clearWithKeyboard: true,
      });

      let data = await lens.getCurrentChartDebugState('xyVisChart');
      expect(data?.axes?.y?.[1].title).to.eql(axisTitle);

      // hide the gridlines
      await testSubjects.click('lnsshowyLeftAxisGridlines');

      data = await lens.getCurrentChartDebugState('xyVisChart');
      expect(data?.axes?.y?.[1].gridlines.length).to.eql(0);

      await lens.closeFlyoutWithBackButton();
    });

    it('should allow filtering by legend on an xy chart', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'extension.raw',
      });

      await lens.filterLegend('jpg');
      const hasExtensionFilter = await filterBar.hasFilter('extension.raw', 'jpg');
      expect(hasExtensionFilter).to.be(true);

      await filterBar.removeFilter('extension.raw');
    });

    it('should allow filtering by legend on a pie chart', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.switchToVisualization('pie');

      await lens.configureDimension({
        dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'extension.raw',
      });

      await lens.configureDimension({
        dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'agent.raw',
      });

      await lens.configureDimension({
        dimension: 'lnsPie_sizeByDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.filterLegend('jpg');
      const hasExtensionFilter = await filterBar.hasFilter('extension.raw', 'jpg');
      expect(hasExtensionFilter).to.be(true);

      await filterBar.removeFilter('extension.raw');
    });

    it('should show visual options button group for a pie chart', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.switchToVisualization('pie');

      await lens.openStyleSettingsFlyout();

      await retry.try(async () => {
        expect(await lens.hasEmptySizeRatioButtonGroup()).to.be(true);
      });
    });

    describe('Area/Line pointVisibility', () => {
      before(async () => {
        await visualize.navigateToNewVisualization();
        await visualize.clickVisType('lens');
        await elasticChart.setNewChartUiDebugFlag(true);
        await lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'date_histogram',
          field: '@timestamp',
        });
        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'average',
          field: 'bytes',
        });
      });

      describe('Line Chart', () => {
        before(async () => {
          await lens.switchToVisualization('line');
          await lens.waitForVisualization('xyVisChart');

          await lens.openStyleSettingsFlyout();
        });
        after(async () => {
          await lens.closeFlyoutWithBackButton();
        });
        it(`points should be visible when Point visibility is 'Auto'`, async () => {
          await testSubjects.click('xy_point_visibility_auto');
          const { lines } = await elasticChart.getChartDebugData('xyVisChart');
          expect(lines?.[0]?.visiblePoints).to.be(true);
        });
        it(`points should be visible when Point visibility is 'Show'`, async () => {
          await testSubjects.click('xy_point_visibility_show');
          const { lines } = await elasticChart.getChartDebugData('xyVisChart');
          expect(lines?.[0]?.visiblePoints).to.be(true);
        });
        it(`points should not be visible when Point visibility is 'Hide'`, async () => {
          await testSubjects.click('xy_point_visibility_hide');
          const { lines } = await elasticChart.getChartDebugData('xyVisChart');
          expect(lines?.[0]?.visiblePoints).to.be(false);
        });
      });

      describe('Area Chart', () => {
        before(async () => {
          await lens.switchToVisualization('area');
          await lens.waitForVisualization('xyVisChart');

          await lens.openStyleSettingsFlyout();
        });
        after(async () => {
          await lens.closeFlyoutWithBackButton();
        });
        it(`points should be visible when Point visibility is 'Auto'`, async () => {
          await testSubjects.click('xy_point_visibility_auto');
          const { areas } = await elasticChart.getChartDebugData('xyVisChart');
          expect(areas?.[0]?.lines?.y1?.visiblePoints).to.be(true);
        });
        it(`points should be visible when Point visibility is 'Show'`, async () => {
          await testSubjects.click('xy_point_visibility_show');
          const { areas } = await elasticChart.getChartDebugData('xyVisChart');
          expect(areas?.[0]?.lines?.y1?.visiblePoints).to.be(true);
        });
        it(`points should not be visible when Point visibility is 'Hide'`, async () => {
          await testSubjects.click('xy_point_visibility_hide');
          const { areas } = await elasticChart.getChartDebugData('xyVisChart');
          expect(areas?.[0]?.lines?.y1?.visiblePoints).to.be(false);
        });
      });
    });
  });
}
