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

  // Add tests here when the flow creates, duplicates, removes, switches, or
  // validates Lens layers or layer-specific chart behavior.
  describe('lens layers', () => {
    it('should transition from a multi-layer stacked bar to a multi-layer line chart and correctly remove all layers', async () => {
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

      await lens.createLayer();

      expect(await lens.hasChartSwitchWarning('line')).to.eql(false);

      await lens.switchToVisualization('line');

      await lens.ensureLayerTabIsActive(0);
      expect(await lens.getLayerType()).to.eql('Line');
      // expect first layer to be line, second layer to be bar chart
      await lens.ensureLayerTabIsActive(1);
      expect(await lens.getLayerType()).to.eql('Bar');
      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'machine.ram',
      });

      await lens.assertLayerCount(2);
      await lens.removeLayer();
      await lens.removeLayer();
      await lens.ensureLayerTabIsActive();
      await testSubjects.existOrFail('workspace-drag-drop-prompt');
    });

    it('should transition selected layer in a multi layer bar using layer chart switch', async () => {
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

      await lens.createLayer('data', undefined, 'bar');
      expect(await lens.getLayerType()).to.eql('Bar');

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'machine.ram',
      });

      // only changes one layer for compatible chart
      await lens.switchToVisualization('line', undefined, 1);
      await lens.ensureLayerTabIsActive(0);
      expect(await lens.getLayerType()).to.eql('Bar');
      await lens.ensureLayerTabIsActive(1);
      expect(await lens.getLayerType()).to.eql('Line');

      // generates new one layer chart based on selected layer
      await lens.switchToVisualization('pie', undefined, 1);
      expect(await lens.getLayerType()).to.eql('Pie');
      const sliceByText = await lens.getDimensionTriggerText('lnsPie_sliceByDimensionPanel');
      const sizeByText = await lens.getDimensionTriggerText('lnsPie_sizeByDimensionPanel');
      expect(sliceByText).to.be('Top 9 values of geo.src');
      expect(sizeByText).to.be('Average of machine.ram');
    });

    it('should transition from a multi-layer stacked bar to treemap chart using suggestions', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

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

      await lens.createLayer();

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.save('twolayerchart');
      await testSubjects.click('lnsSuggestion-treemap > lnsSuggestion');

      await lens.assertLayerCount(1);
      expect(await lens.getDimensionTriggerText('lnsPie_groupByDimensionPanel')).to.eql(
        'Top 9 values of geo.dest'
      );
      expect(await lens.getDimensionTriggerText('lnsPie_sizeByDimensionPanel')).to.eql(
        'Average of bytes'
      );
    });

    it('should keep suggestions up to date with the current configuration', async () => {
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
      // duplicate the layer
      await lens.duplicateLayer();

      // now make the first layer bar percentage to lead it in an broken rendering state
      await lens.ensureLayerTabIsActive(0);
      await lens.switchToVisualizationSubtype('Percentage');

      // now check that both the main visualization and the current visualization suggestion are in error state
      expect(await lens.getWorkspaceErrorCount()).to.eql(1);
      await testSubjects.existOrFail(
        'lnsSuggestion-currentVisualization > lnsSuggestionPanel__error'
      );

      // revert the subtype to stacked and everything should be fine again
      await lens.switchToVisualizationSubtype('Stacked');

      expect(await lens.getWorkspaceErrorCount()).to.eql(0);
      await testSubjects.missingOrFail(
        'lnsSuggestion-currentVisualization > lnsSuggestionPanel__error'
      );
    });
  });
}
