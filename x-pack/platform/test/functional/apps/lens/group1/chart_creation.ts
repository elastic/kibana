/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { LENS_BASIC_FIXTURE_IDS } from '../../../fixtures/kbn_archives/lens/ids';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens } = getPageObjects(['visualize', 'lens']);
  const find = getService('find');
  const listingTable = getService('listingTable');
  const config = getService('config');

  // Add tests here for basic Lens authoring flows: create, save, reopen,
  // change data view, or edit saved visualization metadata from the listing page.
  describe('lens chart creation', () => {
    it('should allow creation of lens xy chart', async () => {
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
        field: '@message.raw',
      });

      await lens.switchToVisualization('lnsDatatable');
      await lens.removeDimension('lnsDatatable_rows');
      await lens.switchToVisualization('area');

      await lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await lens.save('Afancilenstest');

      // Ensure the visualization shows up in the visualize list, and takes
      // us back to the visualization as we configured it.
      await visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('Afancilenstest');
      await lens.clickVisualizeListItemTitle('Afancilenstest');

      await lens.waitForVisualization('xyVisChart');

      expect(await lens.getTitle()).to.eql('Afancilenstest');

      // .echLegendItem__title is the only viable way of getting the xy chart's
      // legend item(s), so we're using a class selector here.
      // 10th item is the other bucket (9 top values + Other)
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(10);
    });

    it('should create an xy visualization with filters aggregation', async () => {
      await lens.openEditor(LENS_BASIC_FIXTURE_IDS.xyVis, 'xyVisChart');

      // Change the IP field to filters
      await lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
        operation: 'filters',
        keepOpen: true,
      });
      await lens.addFilterToAgg(`geo.src : CN`);
      await lens.waitForVisualization('xyVisChart');

      // Verify that the field was persisted from the transition
      expect(await lens.getFiltersAggLabels()).to.eql([`"ip" : *`, `geo.src : CN`]);
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(2);
    });

    it('should allow to change index pattern', async () => {
      let indexPatternString;
      if (config.get('esTestCluster.ccs')) {
        indexPatternString = 'ftr-remote:log*';
      } else {
        indexPatternString = 'log*';
      }

      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.switchFirstLayerIndexPattern(indexPatternString);
      expect(await lens.getFirstLayerIndexPattern()).to.equal(indexPatternString);
    });

    it('should allow edit meta-data for Lens chart on listing page', async () => {
      await visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('Afancilenstest');
      await listingTable.inspectVisualization();
      await listingTable.editVisualizationDetails({
        title: 'Anewfancilenstest',
        description: 'new description',
      });
      await listingTable.searchForItemWithName('Anewfancilenstest');
      await listingTable.expectItemsCount('visualize', 1);
    });
  });
}
