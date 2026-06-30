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
import { LENS_BASIC_FIXTURE_IDS } from '../../../fixtures/kbn_archives/lens/ids';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens } = getPageObjects(['visualize', 'lens']);
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  // Add tests here when the flow primarily changes a dimension, operation,
  // label, format, reference, or incomplete configuration in the dimension editor.
  describe('lens dimension editor', () => {
    it('should edit settings of xy line chart', async () => {
      await lens.openEditor(LENS_BASIC_FIXTURE_IDS.xyVis, 'xyVisChart');

      await lens.removeDimension('lnsXY_splitDimensionPanel');
      await lens.switchToVisualization('line');
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'max',
        field: 'memory',
        keepOpen: true,
      });
      await lens.editDimensionLabel('Test of label');
      await lens.editDimensionFormat('Percent');
      await lens.editDimensionColor('#ff0000');

      await lens.openStyleSettingsFlyout();

      await lens.setCurvedLines('CURVE_MONOTONE_X');
      await lens.editMissingValues('Linear');

      await lens.assertMissingValues('Linear');

      await lens.closeFlyoutWithBackButton();

      await lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      await lens.assertColor('#ff0000');

      await testSubjects.existOrFail('indexPattern-dimension-formatDecimals');

      await lens.closeDimensionEditor();

      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql('Test of label');
    });

    it('should not show static value tab for data layers', async () => {
      await lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      // Quick functions and Formula tabs should be visible
      expect(await testSubjects.exists('lens-dimensionTabs-quickFunctions')).to.eql(true);
      expect(await testSubjects.exists('lens-dimensionTabs-formula')).to.eql(true);
      // Static value tab should not be visible
      expect(await testSubjects.exists('lens-dimensionTabs-static_value')).to.eql(false);

      await lens.closeDimensionEditor();
    });

    it('should be able to add very long labels and still be able to remove a dimension', async () => {
      await lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      const longLabel =
        'Veryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryvery long label wrapping multiple lines';
      await lens.editDimensionLabel(longLabel);
      await lens.waitForVisualization('xyVisChart');
      await lens.closeDimensionEditor();

      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(longLabel);
      expect(await lens.canRemoveDimension('lnsXY_yDimensionPanel')).to.equal(true);
      await lens.removeDimension('lnsXY_yDimensionPanel');
      await testSubjects.missingOrFail('lnsXY_yDimensionPanel > lns-dimensionTrigger');
    });

    it('should create a valid XY chart with references', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'moving_average',
        keepOpen: true,
      });
      await lens.configureReference({
        operation: 'sum',
        field: 'bytes',
      });
      await lens.closeDimensionEditor();

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'cumulative_sum',
        keepOpen: true,
      });
      await lens.configureReference({
        field: 'Records',
      });
      await lens.closeDimensionEditor();

      // Two Y axes that are both valid
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(2);
    });

    it('should allow formatting on references', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.switchToVisualization('lnsDatatable');

      await lens.configureDimension({
        dimension: 'lnsDatatable_rows > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
        disableEmptyRows: true,
      });
      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'moving_average',
        keepOpen: true,
      });
      await lens.configureReference({
        operation: 'sum',
        field: 'bytes',
      });
      await lens.editDimensionFormat('Number');
      await lens.closeDimensionEditor();

      await lens.waitForVisualization();

      const values = await Promise.all(
        range(0, 6).map((index) => lens.getDatatableCellText(index, 1))
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

    /**
     * The edge cases are:
     *
     * 1. Showing errors when creating a partial configuration
     * 2. Being able to drag in a new field while in partial config
     * 3. Being able to switch charts while in partial config
     */
    it('should handle edge cases in reference-based operations', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'cumulative_sum',
      });
      expect(await lens.getWorkspaceErrorCount()).to.eql(1);

      await lens.removeDimension('lnsXY_xDimensionPanel');
      expect(await lens.getWorkspaceErrorCount()).to.eql(2);

      await lens.dragFieldToDimensionTrigger(
        '@timestamp',
        'lnsXY_xDimensionPanel > lns-empty-dimension'
      );
      expect(await lens.getWorkspaceErrorCount()).to.eql(1);

      expect(await lens.hasChartSwitchWarning('lnsDatatable')).to.eql(false);
      await lens.switchToVisualization('lnsDatatable');

      expect(await lens.getDimensionTriggerText('lnsDatatable_metrics')).to.eql(
        'Cumulative sum of (incomplete)'
      );
    });

    it('should keep the field selection while transitioning to every reference-based operation', async () => {
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
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'counter_rate',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'cumulative_sum',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'differences',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'moving_average',
      });

      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Moving average of Sum of bytes'
      );
    });

    it('should not leave an incomplete column in the visualization config with field-based operation', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'min',
      });

      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(undefined);
    });

    it('should revert to previous configuration and not leave an incomplete column in the visualization config with reference-based operations', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'moving_average',
        field: 'Records',
      });

      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Moving average of Count of records'
      );

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'median',
        isPreviousIncompatible: true,
        keepOpen: true,
      });

      expect(await lens.isDimensionEditorOpen()).to.eql(true);

      await lens.closeDimensionEditor();

      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Moving average of Count of records'
      );
    });

    it('should transition from unique count to last value', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'unique_count',
        field: 'ip',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'last_value',
        field: 'bytes',
        isPreviousIncompatible: true,
      });

      expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
        'Last value of bytes'
      );
    });

    it('should correctly optimize multiple percentile metrics', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      for (const percentileValue of [90, 95.5, 99.9]) {
        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'percentile',
          field: 'bytes',
          keepOpen: true,
        });

        await retry.try(async () => {
          const value = `${percentileValue}`;
          // Can not use testSubjects because data-test-subj is placed range input and number input
          const percentileInput = await lens.getNumericFieldReady(
            'lns-indexPattern-percentile-input'
          );
          await percentileInput.type(value);

          const attrValue = await percentileInput.getAttribute('value');
          if (attrValue !== value) {
            throw new Error(`layerPanelTopHitsSize not set to ${value}`);
          }
        });

        await lens.closeDimensionEditor();
      }
      await lens.waitForVisualization('xyVisChart');
      expect(await lens.getWorkspaceErrorCount()).to.eql(0);
    });
  });
}
