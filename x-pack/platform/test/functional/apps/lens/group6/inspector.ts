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
  const elasticChart = getService('elasticChart');
  const inspector = getService('inspector');
  const testSubjects = getService('testSubjects');

  describe('lens inspector', () => {
    before(async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await elasticChart.setNewChartUiDebugFlag(true);
      await lens.goToTimeRange();

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'clientip',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'max',
        field: 'bytes',
      });

      await lens.waitForVisualization('xyVisChart');

      await inspector.open('lnsApp_inspectButton');
    });

    after(async () => {
      await inspector.close();
    });

    it('should inspect table data', async () => {
      await inspector.expectTableData([
        ['232.44.243.247', '19,986'],
        ['252.59.37.77', '19,985'],
        ['239.180.70.74', '19,984'],
        ['206.22.226.5', '19,952'],
        ['80.252.219.9', '19,950'],
        ['Other', '19,941'],
      ]);
    });

    it('should inspect request data', async () => {
      await inspector.openInspectorRequestsView();
      expect(await inspector.getRequestNames()).to.be('Data,Other bucket');
    });

    it('should close the inspector when navigating away from Lens', async () => {
      await visualize.navigateToNewVisualization();
      expect(await testSubjects.exists('inspectorPanel')).to.be(false);
    });
  });
}
