/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { lens, timePicker, dashboard } = getPageObjects(['lens', 'timePicker', 'dashboard']);

  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');
  const panelActions = getService('dashboardPanelActions');
  const kibanaServer = getService('kibanaServer');

  describe('Gauge', function describeIndexTests() {
    const fixture =
      'x-pack/test_serverless/functional/fixtures/kbn_archiver/lens/open_in_lens/tsvb/gauge.json';

    before(async () => {
      await kibanaServer.importExport.load(fixture);
    });

    after(async () => {
      await kibanaServer.importExport.unload(fixture);
    });

    beforeEach(async () => {
      await dashboard.navigateToApp(); // required for svl until dashboard PO navigation is fixed
      await dashboard.gotoDashboardEditMode('Convert to Lens - TSVB - Gauge');
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should show the "Convert to Lens" menu item', async () => {
      expect(await panelActions.canConvertToLensByTitle('Gauge - Basic')).to.eql(true);
    });

    it('should convert to Lens', async () => {
      await panelActions.convertToLensByTitle('Gauge - Basic');
      await lens.waitForVisualization('mtrVis');

      const metricData = await lens.getMetricVisualizationData();
      expect(metricData[0].title).to.eql('Count of records');
    });

    it('should convert metric with params', async () => {
      await panelActions.convertToLensByTitle('Gauge - Value count');
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
      expect(await panelActions.canConvertToLensByTitle('Gauge - Unsupported metric')).to.eql(
        false
      );
    });

    it('should not allow converting of invalid panel', async () => {
      expect(await panelActions.canConvertToLensByTitle('Gauge - Invalid panel')).to.eql(false);
    });

    it('should convert color ranges', async () => {
      await panelActions.convertToLensByTitle('Gauge - Color ranges');
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
      await panelActions.convertToLensByTitle('Gauge - Ignore global filters series');
      await lens.waitForVisualization('mtrVis');
      expect(await testSubjects.exists('lnsChangeIndexPatternIgnoringFilters')).to.be(true);
    });

    it('should bring the ignore global filters configured at panel level over', async () => {
      await panelActions.convertToLensByTitle('Gauge - Ignore global filters panel');
      await lens.waitForVisualization('mtrVis');
      expect(await testSubjects.exists('lnsChangeIndexPatternIgnoringFilters')).to.be(true);
    });
  });
}
