/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens, common } = getPageObjects(['visualize', 'lens', 'common']);
  const find = getService('find');
  const listingTable = getService('listingTable');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const fieldEditor = getService('fieldEditor');
  const retry = getService('retry');
  const dataViews = getService('dataViews');

  describe('lens formula', () => {
    it('should transition from count to formula', async () => {
      await visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await lens.clickVisualizeListItemTitle('lnsXYvis');
      await lens.goToTimeRange();

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'average',
        field: 'bytes',
        keepOpen: true,
      });

      await lens.switchToFormula();
      await lens.waitForVisualization('xyVisChart');
      // .echLegendItem__title is the only viable way of getting the xy chart's
      // legend item(s), so we're using a class selector here.
      // 4th item is the other bucket
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(3);
    });

    it('should update and delete a formula', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();
      await lens.switchToVisualization('lnsDatatable');

      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `count(kql=`,
        keepOpen: true,
      });

      const input = await find.activeElement();
      await input.type('*');

      await retry.try(async () => {
        expect(await lens.getDatatableCellText(0, 0)).to.eql('14,005');
      });
    });

    it('should insert single quotes and escape when needed to create valid KQL', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();
      await lens.switchToVisualization('lnsDatatable');

      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `count(kql=`,
        keepOpen: true,
      });

      let input = await find.activeElement();
      await input.type(' ');
      await input.pressKeys(browser.keys.ARROW_LEFT);
      await input.type(`Men's Clothing`);

      await common.sleep(100);

      await lens.expectFormulaText(`count(kql='Men\\'s Clothing ')`);

      await lens.typeFormula('count(kql=');

      input = await find.activeElement();
      await input.type(`Men\'s Clothing`);

      await common.sleep(100);

      await lens.expectFormulaText(`count(kql='Men\\'s Clothing')`);
    });

    it('should insert single quotes and escape when needed to create valid field name', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();
      await lens.switchToVisualization('lnsDatatable');
      await dataViews.clickAddFieldFromSearchBar();
      await fieldEditor.setName(`ab' "'`, true, true);
      await fieldEditor.enableValue();
      await fieldEditor.typeScript("emit('abc')");
      await fieldEditor.save();

      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'unique_count',
        field: `ab`,
        keepOpen: true,
      });

      await lens.switchToFormula();
      await lens.expectFormulaText(`unique_count('ab\\' "\\'')`);

      await lens.typeFormula('unique_count(');
      const input = await find.activeElement();
      await input.type('ab');
      await input.pressKeys(browser.keys.ENTER);

      await common.sleep(100);

      await lens.expectFormulaText(`unique_count('ab\\' "\\'')`);
    });

    it('should persist a broken formula on close', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();
      await lens.switchToVisualization('lnsDatatable');

      // Close immediately
      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `asdf`,
      });

      expect(await lens.getDimensionTriggerText('lnsDatatable_metrics')).to.eql('asdf');

      await lens.assertMessageListContains('Field asdf was not found.', 'error');
    });

    it('should keep the formula when entering expanded mode', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();
      await lens.switchToVisualization('lnsDatatable');

      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `count()`,
        keepOpen: true,
      });

      await lens.toggleFullscreen();

      const element = await find.byCssSelector('.monaco-editor');
      expect(await element.getVisibleText()).to.equal('count()');
    });

    it('should allow an empty formula combined with a valid formula', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();
      await lens.switchToVisualization('lnsDatatable');

      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `count()`,
      });
      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
      });

      await lens.waitForVisualization();
      expect(await lens.getWorkspaceErrorCount()).to.eql(0);
    });

    it('should duplicate a moving average formula and be a valid table with conditional coloring', async () => {
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
        operation: 'formula',
        formula: `moving_average(sum(bytes), window=5`,
        keepOpen: true,
      });
      await lens.setTableDynamicColoring('text');
      await lens.waitForVisualization();
      const styleObj = await lens.getDatatableCellStyle(1, 1);
      expect(styleObj['background-color']).to.be(undefined);
      expect(styleObj.color).not.to.be(undefined);

      await lens.closeDimensionEditor();

      await lens.dragDimensionToDimension({
        from: 'lnsDatatable_metrics > lns-dimensionTrigger',
        to: 'lnsDatatable_metrics > lns-empty-dimension',
      });
      expect(await lens.getDatatableCellText(1, 1)).to.eql('222,420');
      expect(await lens.getDatatableCellText(1, 2)).to.eql('222,420');
    });

    it('should keep the formula if the user does not fully transition to a quick function', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();
      await lens.switchToVisualization('lnsDatatable');

      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `count()`,
        keepOpen: true,
      });

      await lens.switchToQuickFunctions();
      await testSubjects.click(`lns-indexPatternDimension-min incompatible`);
      await common.sleep(1000);
      await lens.closeDimensionEditor();

      expect(await lens.getDimensionTriggerText('lnsDatatable_metrics', 0)).to.eql('count()');
    });

    it('should keep the formula if the user does not fully transition to a static value', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.createLayer('referenceLine');

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yReferenceLineLeftPanel > lns-dimensionTrigger',
        operation: 'formula',
        formula: `count()`,
        keepOpen: true,
      });

      await lens.switchToStaticValue();
      await lens.closeDimensionEditor();
      await common.sleep(1000);

      expect(await lens.getDimensionTriggerText('lnsXY_yReferenceLineLeftPanel', 0)).to.eql(
        'count()'
      );
    });

    it('should allow numeric only formulas', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();
      await lens.switchToVisualization('lnsDatatable');

      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `0`,
      });

      await lens.dragDimensionToDimension({
        from: 'lnsDatatable_metrics > lns-dimensionTrigger',
        to: 'lnsDatatable_metrics > lns-empty-dimension',
      });
      expect(await lens.getDatatableCellText(0, 0)).to.eql('0');
      expect(await lens.getDatatableCellText(0, 1)).to.eql('0');
    });

    it('should apply a global filter to the current formula', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();
      await lens.switchToVisualization('lnsDatatable');

      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `count()`,
        keepOpen: true,
      });

      // check the numbers
      await lens.waitForVisualization();
      expect(await lens.getDatatableCellText(0, 0)).to.eql('14,005');

      // add an advanced filter by filter
      await lens.enableFilter();
      await lens.setFilterBy('bytes > 4000');

      // check that numbers changed
      await lens.waitForVisualization();
      await retry.try(async () => {
        expect(await lens.getDatatableCellText(0, 0)).to.eql('9,169');
      });

      // now change the formula to add an inner filter to count
      await lens.typeFormula(`count(kql=`);

      const input = await find.activeElement();
      await input.type(`bytes > 600000`);
      // the autocomplete will add quotes and closing brakets, so do not worry about that

      await lens.waitForVisualization();
      expect(await lens.getDatatableCellText(0, 0)).to.eql('0');
    });
  });
}
