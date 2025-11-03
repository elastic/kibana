/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const elasticChart = getService('elasticChart');
  const esArchiver = getService('esArchiver');
  const aiops = getService('aiops');

  // aiops lives in the ML UI so we need some related services.
  const ml = getService('ml');
  const PageObjects = getPageObjects(['timePicker']);

  describe('change point detection UI', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/ecommerce');
      await ml.testResources.createDataViewIfNeeded('ft_ecommerce', 'order_date');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.testResources.deleteDataViewByTitle('ft_ecommerce');
    });

    it(`loads the change point detection page`, async () => {
      // Start navigation from the base of the ML app.
      await ml.navigation.navigateToMl();
      await elasticChart.setNewChartUiDebugFlag(true);
      await aiops.changePointDetectionPage.navigateToDataViewSelection();
      await ml.jobSourceSelection.selectSourceForChangePointDetection('ft_ecommerce');
      await aiops.changePointDetectionPage.assertChangePointDetectionPageExists();
    });

    it('shows a no data screen if there is no data available for selected time range', async () => {
      await aiops.changePointDetectionPage.assertNoDataFoundScreen();
    });

    it('displays a sample result and warning when no change point was found', async () => {
      await aiops.changePointDetectionPage.clickUseFullDataButton();
      await ml.testExecution.logTestStep(
        'Displays a callout warning when no change point was found with no reason'
      );
      await aiops.changePointDetectionPage.assertNoChangePointFoundCalloutWarning();

      await PageObjects.timePicker.setAbsoluteRange(
        'Jun 12, 2023 @ 00:04:19.000',
        'Jun 12, 2023 @ 01:00:19.000'
      );

      await ml.testExecution.logTestStep('Displays a reason why no change point was found');
      await aiops.changePointDetectionPage.assertNoChangePointFoundCalloutWarning(
        'not enough buckets to calculate change_point. Requires at least [22]; found [6]'
      );

      // Verify that we still have one result in the table
      const result = await aiops.changePointDetectionPage.getTable(0).parseTable();
      expect(result.length).to.eql(1);
    });

    it('displays a sample result and warning when no change point was found with split field selected', async () => {
      await aiops.changePointDetectionPage.clickUseFullDataButton();

      await aiops.changePointDetectionPage.selectSplitField(0, 'customer_gender');

      await ml.testExecution.logTestStep(
        'Displays a callout warning when no change point was found with split field'
      );
      await aiops.changePointDetectionPage.assertNoChangePointFoundCalloutWarning();

      await PageObjects.timePicker.setAbsoluteRange(
        'Jun 12, 2023 @ 00:04:19.000',
        'Jun 12, 2023 @ 01:00:19.000'
      );

      await ml.testExecution.logTestStep(
        'Displays a reason why no change point was found with split field'
      );
      await aiops.changePointDetectionPage.assertNoChangePointFoundCalloutWarning(
        'not enough buckets to calculate change_point. Requires at least [22]; found [3]'
      );

      // Verify that we still have results in the table
      const result = await aiops.changePointDetectionPage.getTable(0).parseTable();
      expect(result.length).to.eql(1);
    });

    it('detects a change point when no split field is selected', async () => {
      await aiops.changePointDetectionPage.clickUseFullDataButton();
      await aiops.changePointDetectionPage.selectMetricField(0, 'products.discount_amount');
      const result = await aiops.changePointDetectionPage.getTable(0).parseTable();
      expect(result.length).to.eql(1);
      expect(Number(result[0].pValue)).to.be.lessThan(1);
      expect(result[0].type).to.eql('distribution_change');

      await ml.testExecution.logTestStep('Check the change point chart is rendered');
      await elasticChart.waitForRenderComplete('aiopChangePointPreviewChart > xyVisChart', 5000);
      const chartState = await elasticChart.getChartDebugData(
        'aiopChangePointPreviewChart > xyVisChart',
        0,
        5000
      );
      if (!chartState) {
        throw new Error('Preview chart debug state is not available');
      }
      expect(chartState.annotations![0].data.details).to.eql('distribution_change');
      expect(chartState.annotations![0].domainType).to.eql('xDomain');
      expect(chartState.lines![0].points.length).to.be.above(30);
    });

    it('shows multiple results when split field is selected', async () => {
      await aiops.changePointDetectionPage.clickUseFullDataButton();
      await aiops.changePointDetectionPage.selectMetricField(0, 'products.discount_amount');
      await aiops.changePointDetectionPage.selectSplitField(0, 'geoip.city_name');

      const tableService = aiops.changePointDetectionPage.getTable(0);
      await tableService.waitForTableToLoad();
      const result = await tableService.parseTable();
      // the aggregation may return different results (+-1)
      expect(result.length).to.be.above(4);
      // assert asc sorting by p_value is applied
      expect(parseFloat(result[0].pValue)).to.be.lessThan(parseFloat(result[3].pValue));
    });

    it('allows change point selection for detailed view', async () => {
      const tableService = aiops.changePointDetectionPage.getTable(0);

      await tableService.selectAllRows();
      await aiops.changePointDetectionPage.viewSelected();
      await aiops.changePointDetectionPage.assertDetailedView(5);
      await aiops.changePointDetectionPage.closeFlyout();
      // deselect
      await tableService.selectAllRows();
    });

    it('supports a quick filter actions', async () => {
      const tableService = aiops.changePointDetectionPage.getTable(0);
      await tableService.invokeAction(0, 'aiopsChangePointFilterForValue', async () => {
        await aiops.changePointDetectionPage.assertFiltersApplied();
        await tableService.waitForTableToStartLoading();
      });
      const resultFor = await tableService.parseTable();
      expect(resultFor.length).to.eql(1);
    });

    it('supports multiple configurations for change point detection', async () => {
      await aiops.changePointDetectionPage.assertPanelExist(0);
      await aiops.changePointDetectionPage.addChangePointConfig();
      await aiops.changePointDetectionPage.assertPanelExist(1);
    });
  });
}
