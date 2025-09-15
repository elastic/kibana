/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens } = getPageObjects(['visualize', 'lens']);

  describe('time shift', () => {
    it('should able to configure a shifted metric', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();
      await lens.switchToVisualization('lnsDatatable');
      await lens.configureDimension({
        dimension: 'lnsDatatable_rows > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
        disableEmptyRows: true,
      });
      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'median',
        field: 'bytes',
      });
      await lens.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger');
      await lens.enableTimeShift();
      await lens.setTimeShift('6h');

      await lens.waitForVisualization();
      expect(await lens.getDatatableCellText(0, 1)).to.eql('5,994');
    });

    it('should able to configure a regular metric next to a shifted metric', async () => {
      await lens.closeDimensionEditor();
      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.waitForVisualization();

      expect(await lens.getDatatableCellText(2, 1)).to.eql('5,994');
      expect(await lens.getDatatableCellText(2, 2)).to.eql('5,722.622');
    });

    it('should show an error if terms is used and provide a fix action', async () => {
      await lens.configureDimension({
        dimension: 'lnsDatatable_rows > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      expect(await lens.hasFixAction()).to.be(true);
      await lens.useFixAction();

      expect(await lens.getDatatableCellText(2, 2)).to.eql('6,976');
      expect(await lens.getDatatableCellText(2, 3)).to.eql('4,182.5');

      expect(await lens.getDatatableHeaderText(0)).to.eql('Filters of ip');
    });

    it('should show an error if multi terms is used and provide a fix action', async () => {
      await lens.configureDimension({
        dimension: 'lnsDatatable_rows > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
        keepOpen: true,
      });

      await lens.addTermToAgg('geo.src');

      await lens.closeDimensionEditor();

      expect(await lens.hasFixAction()).to.be(true);
      await lens.useFixAction();

      expect(await lens.getDatatableHeaderText(1)).to.eql('Filters of ip › geo.src');
    });
  });
}
