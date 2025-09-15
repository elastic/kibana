/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, visualBuilder, lens, header } = getPageObjects([
    'visualBuilder',
    'visualize',
    'lens',
    'header',
  ]);

  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');

  describe('Gauge', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
    });

    beforeEach(async () => {
      await visualBuilder.resetPage();
      await visualBuilder.clickGauge();
      await visualBuilder.clickDataTab('gauge');
    });

    it('should show the "Edit Visualization in Lens" menu item', async () => {
      expect(await visualize.hasNavigateToLensButton()).to.eql(true);
    });

    it('should convert to Lens', async () => {
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('mtrVis');

      const metricData = await lens.getMetricVisualizationData();
      expect(metricData[0].title).to.eql('Count of records');
    });

    it('should convert metric with params', async () => {
      await visualBuilder.selectAggType('Value Count');
      await visualBuilder.setFieldForAggregation('bytes');

      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('mtrVis');
      await retry.try(async () => {
        const layers = await find.allByCssSelector(`[data-test-subj^="lns-layerPanel-"]`);
        expect(layers).to.have.length(1);

        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(2);
        expect(await dimensions[0].getVisibleText()).to.be('Count of bytes');
        expect(await dimensions[1].getVisibleText()).to.be('overall_max(count(bytes))');
      });
    });

    it('should not allow converting of unsupported metric', async () => {
      await visualBuilder.selectAggType('Counter Rate');
      await visualBuilder.setFieldForAggregation('machine.ram');

      await header.waitUntilLoadingHasFinished();

      expect(await visualize.hasNavigateToLensButton()).to.be(false);
    });

    it('should not allow converting of not valid panel', async () => {
      await visualBuilder.selectAggType('Value Count');

      await header.waitUntilLoadingHasFinished();

      expect(await visualize.hasNavigateToLensButton()).to.be(false);
    });

    it('should convert color ranges', async () => {
      await visualBuilder.setMetricsGroupByTerms('extension.raw');

      await visualBuilder.clickPanelOptions('gauge');

      await visualBuilder.setColorRuleOperator('>= greater than or equal');
      await visualBuilder.setColorRuleValue(10);
      await visualBuilder.setColorPickerValue('#54B399', 2);

      await visualBuilder.createColorRule();

      await visualBuilder.setColorRuleOperator('>= greater than or equal');
      await visualBuilder.setColorRuleValue(100, 1);
      await visualBuilder.setColorPickerValue('#54A000', 4);

      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();

      await lens.waitForVisualization('mtrVis');
      await retry.try(async () => {
        const closePalettePanels = await testSubjects.findAll(
          'lns-indexPattern-SettingWithSiblingFlyoutBack'
        );
        if (closePalettePanels.length) {
          await lens.closePalettePanel();
          await lens.closeDimensionEditor();
        }

        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(3);

        await dimensions[0].click();

        await lens.openPalettePanel();
        const colorStops = await lens.getPaletteColorStops();

        expect(colorStops).to.eql([
          { stop: '', color: 'rgba(104, 188, 0, 1)' },
          { stop: '10', color: 'rgba(84, 179, 153, 1)' },
          { stop: '100', color: 'rgba(84, 160, 0, 1)' },
          { stop: '', color: undefined },
        ]);
      });
    });

    it('should bring the ignore global filters configured at series level over', async () => {
      await visualBuilder.clickSeriesOption();
      await visualBuilder.setIgnoreFilters(true);
      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('mtrVis');
      expect(await testSubjects.exists('lnsChangeIndexPatternIgnoringFilters')).to.be(true);
    });

    it('should bring the ignore global filters configured at panel level over', async () => {
      await visualBuilder.clickPanelOptions('gauge');
      await visualBuilder.setIgnoreFilters(true);
      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('mtrVis');
      expect(await testSubjects.exists('lnsChangeIndexPatternIgnoringFilters')).to.be(true);
    });
  });
}
