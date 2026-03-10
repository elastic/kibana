/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, visEditor, lens, timePicker, header } = getPageObjects([
    'visualize',
    'lens',
    'visEditor',
    'timePicker',
    'header',
  ]);

  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');

  describe('Table', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
    });

    beforeEach(async () => {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickDataTable();
      await visualize.clickNewSearch();
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should not allow converting of unsupported aggregations', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Serial diff', 'metrics');
      await visEditor.clickBucket('Split rows');
      await visEditor.selectAggregation('Date histogram');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();
      const button = await testSubjects.exists('visualizeEditInLensButton');
      expect(button).to.eql(false);
    });

    it('should show the "Edit Visualization in Lens" menu item', async () => {
      expect(await visualize.hasNavigateToLensButton()).to.eql(true);
    });

    it('should convert aggregation with params', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Average', 'metrics');
      await visEditor.selectField('machine.ram', 'metrics');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('lnsDataTable');

      expect(await lens.getLayerCount()).to.be(1);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(1);
      expect(await dimensions[0].getVisibleText()).to.be('Average machine.ram');
    });

    it('should convert total function to summary row', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Average', 'metrics');
      await visEditor.selectField('machine.ram', 'metrics');
      await visEditor.clickOptionsTab();
      const showTotalSwitch = await testSubjects.find('showTotal');
      await showTotalSwitch.click();
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('lnsDataTable');

      expect(await lens.getLayerCount()).to.be(1);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(1);
      expect(await dimensions[0].getVisibleText()).to.be('Average machine.ram');

      await lens.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger');
      expect(await comboBox.getComboBoxSelectedOptions('lnsDatatable_summaryrow_function')).to.eql([
        'Sum',
      ]);
    });

    it('should convert sibling pipeline aggregation', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Max Bucket', 'metrics');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('lnsDataTable');

      expect(await lens.getLayerCount()).to.be(1);

      const metricText = await lens.getDimensionTriggerText('lnsDatatable_metrics', 0);
      const splitRowText = await lens.getDimensionTriggerText('lnsDatatable_rows', 0);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(2);
      expect(metricText).to.be('Overall Max of Count');
      expect(splitRowText).to.be('@timestamp');
    });

    it('should convert parent pipeline aggregation', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Cumulative sum', 'metrics');
      await visEditor.clickBucket('Split rows');
      await visEditor.selectAggregation('Date histogram');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('lnsDataTable');

      expect(await lens.getLayerCount()).to.be(1);

      const metricText = await lens.getDimensionTriggerText('lnsDatatable_metrics', 0);
      const splitRowText = await lens.getDimensionTriggerText('lnsDatatable_rows', 0);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(2);
      expect(metricText).to.be('Cumulative Sum of Count');
      expect(splitRowText).to.be('@timestamp');
    });

    it('should convert split rows and split table to split table rows', async () => {
      await visEditor.clickBucket('Split rows');
      await visEditor.selectAggregation('Date histogram');
      await visEditor.clickBucket('Split table');
      await visEditor.selectAggregation('Terms', 'buckets', false, 1);
      await visEditor.selectField('bytes', 'buckets', false, 1);
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('lnsDataTable');

      expect(await lens.getLayerCount()).to.be(1);

      const metricText = await lens.getDimensionTriggerText('lnsDatatable_metrics', 0);
      const splitRowText1 = await lens.getDimensionTriggerText('lnsDatatable_rows', 0);
      const splitRowText2 = await lens.getDimensionTriggerText('lnsDatatable_rows', 1);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(3);
      expect(metricText).to.be('Count');
      expect(splitRowText1).to.be('@timestamp');
      expect(splitRowText2).to.be('bytes: Descending');
    });

    it('should convert percentage column', async () => {
      await visEditor.clickOptionsTab();
      await visEditor.setSelectByOptionText('datatableVisualizationPercentageCol', 'Count');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('lnsDataTable');

      expect(await lens.getLayerCount()).to.be(1);

      const metricText = await lens.getDimensionTriggerText('lnsDatatable_metrics', 0);
      const percentageColumnText = await lens.getDimensionTriggerText('lnsDatatable_metrics', 1);

      await lens.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger', 0, 1);
      expect(await comboBox.getComboBoxSelectedOptions('indexPattern-dimension-format')).to.eql([
        'Percent',
      ]);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(2);
      expect(metricText).to.be('Count');
      expect(percentageColumnText).to.be('Count percentages');
    });
  });
}
