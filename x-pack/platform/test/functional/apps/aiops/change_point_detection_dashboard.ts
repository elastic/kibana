/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '@kbn/aiops-change-point-detection/constants';
import { FtrProviderContext } from '../../ftr_provider_context';

const dashboardTitle = 'Change point detection';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const elasticChart = getService('elasticChart');
  const esArchiver = getService('esArchiver');
  const aiops = getService('aiops');

  // aiops lives in the ML UI so we need some related services.
  const ml = getService('ml');

  const PageObjects = getPageObjects(['dashboard', 'timePicker']);

  describe('change point detection in dashboard', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
      await ml.testResources.createDataViewIfNeeded('ft_ecommerce', 'order_date');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.testResources.deleteDashboardByTitle(dashboardTitle);
      await ml.testResources.deleteDataViewByTitle('ft_ecommerce');
    });

    it('attaches change point charts to a dashboard from the ML app', async () => {
      await ml.navigation.navigateToMl();
      await elasticChart.setNewChartUiDebugFlag(true);
      await aiops.changePointDetectionPage.navigateToDataViewSelection();
      await ml.jobSourceSelection.selectSourceForChangePointDetection('ft_ecommerce');
      await aiops.changePointDetectionPage.assertChangePointDetectionPageExists();

      await aiops.changePointDetectionPage.clickUseFullDataButton();
      await aiops.changePointDetectionPage.selectMetricField(0, 'products.discount_amount');
      await aiops.changePointDetectionPage.selectSplitField(0, 'geoip.city_name');

      await aiops.changePointDetectionPage.assertPanelExist(0);
      await aiops.changePointDetectionPage.attachChartsToDashboard(0, {
        applyTimeRange: true,
        maxSeries: 1,
      });
    });

    it('attaches change point charts to a dashboard from the dashboard app', async () => {
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.clickNewDashboard();

      await aiops.dashboardEmbeddables.assertDashboardIsEmpty();
      await aiops.dashboardEmbeddables.openEmbeddableInitializer(
        EMBEDDABLE_CHANGE_POINT_CHART_TYPE
      );

      await aiops.dashboardEmbeddables.assertInitializerConfirmButtonEnabled(
        'aiopsChangePointChartsInitializerConfirmButton',
        false
      );
      await aiops.dashboardEmbeddables.assertChangePointChartEmbeddableDataViewSelectorExists();
      await aiops.dashboardEmbeddables.selectChangePointChartEmbeddableDataView('ft_ecommerce');

      await aiops.dashboardEmbeddables.assertInitializerConfirmButtonEnabled(
        'aiopsChangePointChartsInitializerConfirmButton'
      );
      await aiops.dashboardEmbeddables.submitChangePointInitForm();
      await aiops.dashboardEmbeddables.assertChangePointPanelExists();
      await PageObjects.dashboard.saveDashboard(dashboardTitle);
    });

    it('shows a no data screen if there is no data available for selected time range', async () => {
      await aiops.changePointDetectionPage.assertNoDataFoundScreen();
    });

    it('shows a warning when no change point was found', async () => {
      await PageObjects.timePicker.setAbsoluteRange(
        'Jun 12, 2023 @ 00:04:19.000',
        'Jun 12, 2023 @ 01:00:19.000'
      );
      await aiops.changePointDetectionPage.assertNoChangePointFoundCalloutWarning();
    });
  });
}
