/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

// Maximum number of initial ESQL columns loaded
// This is a temporary limit to avoid overwhelming the UI with too many columns
// Should be syncronized with MAX_NUM_OF_COLUMNS
const MAX_NUM_OF_INITIAL_ESQL_COLUMNS = 10;

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard, header, common, timePicker, lens } = getPageObjects([
    'dashboard',
    'header',
    'common',
    'timePicker',
    'lens',
  ]);
  const dashboardAddPanel = getService('dashboardAddPanel');
  const monacoEditor = getService('monacoEditor');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const security = getService('security');

  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('lens ES|QL tests', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.uiSettings.replace(defaultSettings);
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    after(async () => {
      await timePicker.resetDefaultAbsoluteRangeViaUiSettings();
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
    });

    it('should keep the table type when the user adds a limit', async () => {
      await dashboard.navigateToApp();
      // no dataviews page
      await testSubjects.click('tryESQLLink');
      await dashboard.switchToEditMode();
      // edit the existing panel that is being added when the Try ES|QL CTA is clicked
      const [panel] = await dashboard.getDashboardPanels();
      await dashboardPanelActions.clickInlineEdit(panel);
      await dashboard.waitForRenderComplete();
      // Verify ES|QL editor IS visible in Dashboard inline edit mode
      await testSubjects.existOrFail('InlineEditingESQLEditor');

      await monacoEditor.setCodeEditorValue('from logstash-*');
      await testSubjects.click('ESQLEditor-run-query-button');
      await header.waitUntilLoadingHasFinished();

      // check that the type is still line
      const chartSwitcher = await testSubjects.find('lnsChartSwitchPopover');
      const type = await chartSwitcher.getVisibleText();
      expect(type).to.be('Table');

      // Remove all columns
      let count = MAX_NUM_OF_INITIAL_ESQL_COLUMNS;
      while (count-- > 0) {
        await lens.removeDimension('lnsDatatable_metrics');
      }
      // Add another column
      await lens.configureTextBasedLanguagesDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        field: 'bytes',
        keepOpen: true,
      });
      await header.waitUntilLoadingHasFinished();
      await testSubjects.click('lns-indexPattern-dimensionContainerClose');

      await monacoEditor.setCodeEditorValue('from logstash-* | limit 100');

      await testSubjects.click('ESQLEditor-run-query-button');
      await header.waitUntilLoadingHasFinished();

      // Table should still be present
      const chartType = await chartSwitcher.getVisibleText();
      expect(chartType).to.be('Table');

      const metricText = await lens.getDimensionTriggerText('lnsDatatable_metrics', 0, true);
      expect(metricText).to.be('bytes');

      await testSubjects.click('applyFlyoutButton');
    });

    it('should remain table if the user edits an existing table panel', async () => {
      const [panel] = await dashboard.getDashboardPanels();
      await dashboardPanelActions.clickInlineEdit(panel);
      await dashboard.waitForRenderComplete();

      await monacoEditor.setCodeEditorValue('from logstash-* | STATS COUNT(*) BY geo.dest');
      await testSubjects.click('ESQLEditor-run-query-button');
      await header.waitUntilLoadingHasFinished();

      // check that the type is still line
      const chartSwitcher = await testSubjects.find('lnsChartSwitchPopover');
      const type = await chartSwitcher.getVisibleText();
      expect(type).to.be('Table');

      await testSubjects.click('applyFlyoutButton');
    });

    it('should add a limit without changing the chart type or the color', async () => {
      const [panel] = await dashboard.getDashboardPanels();
      await dashboardPanelActions.removePanel(panel);
      await header.waitUntilLoadingHasFinished();

      await dashboardAddPanel.openAddPanelFlyout();
      await dashboardAddPanel.clickAddNewPanelFromUIActionLink('ES|QL');
      await header.waitUntilLoadingHasFinished();

      await dashboard.waitForRenderComplete();

      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats maxB = max(bytes) by geo.dest'
      );
      await testSubjects.click('ESQLEditor-run-query-button');
      await header.waitUntilLoadingHasFinished();

      // change to line chart
      await testSubjects.click('lnsChartSwitchPopover');
      await testSubjects.click('lnsChartSwitchPopover_line');
      await header.waitUntilLoadingHasFinished();

      // change the color to red
      await testSubjects.click('lnsXY_yDimensionPanel');
      const colorPickerInput = await testSubjects.find('~indexPattern-dimension-colorPicker');
      await colorPickerInput.clearValueWithKeyboard();
      await colorPickerInput.type('#ff0000');
      await common.sleep(1000); // give time for debounced components to rerender

      await header.waitUntilLoadingHasFinished();
      await testSubjects.click('lns-indexPattern-dimensionContainerClose');
      await testSubjects.click('applyFlyoutButton');
      expect(await testSubjects.exists('xyVisChart')).to.be(true);

      const [firstPanel] = await dashboard.getDashboardPanels();
      await dashboardPanelActions.clickInlineEdit(firstPanel);

      await header.waitUntilLoadingHasFinished();
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats maxB = max(bytes) by geo.dest | limit 10'
      );
      await testSubjects.click('ESQLEditor-run-query-button');
      await header.waitUntilLoadingHasFinished();

      // check that the type is still line
      const chartSwitcher = await testSubjects.find('lnsChartSwitchPopover');
      const type = await chartSwitcher.getVisibleText();
      expect(type).to.be('Line');

      // check that the color is still red
      await testSubjects.click('lnsXY_yDimensionPanel');
      const colorPickerInputAfterFilter = await testSubjects.find(
        '~indexPattern-dimension-colorPicker'
      );
      expect(await colorPickerInputAfterFilter.getAttribute('value')).to.be('#FF0000');
    });
  });
}
