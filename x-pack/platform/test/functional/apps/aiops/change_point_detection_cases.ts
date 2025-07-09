/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { USER } from '../../../api_integration/services/ml/security_common';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const elasticChart = getService('elasticChart');
  const esArchiver = getService('esArchiver');
  const aiops = getService('aiops');
  const cases = getService('cases');
  const PageObjects = getPageObjects(['timePicker']);

  // aiops lives in the ML UI so we need some related services.
  const ml = getService('ml');

  describe('change point detection in cases', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
      await ml.testResources.createDataViewIfNeeded('ft_ecommerce', 'order_date');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    beforeEach(async () => {
      await ml.navigation.navigateToMl();
      await elasticChart.setNewChartUiDebugFlag(true);
      await aiops.changePointDetectionPage.navigateToDataViewSelection();
      await ml.jobSourceSelection.selectSourceForChangePointDetection('ft_ecommerce');
      await aiops.changePointDetectionPage.assertChangePointDetectionPageExists();
    });

    after(async () => {
      await ml.testResources.deleteDataViewByTitle('ft_ecommerce');
      await cases.api.deleteAllCases();
    });

    it('attaches change point charts to a case', async () => {
      await aiops.changePointDetectionPage.clickUseFullDataButton();
      await aiops.changePointDetectionPage.selectMetricField(0, 'products.discount_amount');

      const caseParams = {
        title: 'ML Change Point Detection case',
        description: 'Case with a change point detection attachment',
        tag: 'ml_change_point_detection',
        reporter: USER.ML_POWERUSER,
      };

      await ml.testExecution.logTestStep('attaches chart to a case');
      await aiops.changePointDetectionPage.attachChangePointToCases(0, 'charts', caseParams);

      await ml.testExecution.logTestStep('checks if attachment is present in the case');
      await ml.cases.assertCaseWithChangePointDetectionChartsAttachment(caseParams);
    });

    it('attaches no results change point table to a case', async () => {
      await PageObjects.timePicker.setAbsoluteRange(
        'Jun 12, 2023 @ 00:04:19.000',
        'Jun 12, 2023 @ 01:00:19.000'
      );

      const caseParams = {
        title: 'ML Change Point Detection No Results case',
        description: 'Case with a no results change point detection attachment',
        tag: 'ml_no_change_point_detection',
        reporter: USER.ML_POWERUSER,
      };

      await ml.testExecution.logTestStep('attaches chart to a case');
      await aiops.changePointDetectionPage.attachChangePointToCases(0, 'table', caseParams);

      await ml.testExecution.logTestStep('checks if attachment is present in the case');
      await ml.cases.assertCaseWithChangePointDetectionChartsAttachment(caseParams);
      await aiops.changePointDetectionPage.assertNoChangePointFoundCalloutWarning();
    });
  });
}
