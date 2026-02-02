/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../services/ml/security_common';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const elasticChart = getService('elasticChart');
  const esArchiver = getService('esArchiver');
  const aiops = getService('aiops');
  const ml = getService('ml');
  const selectedField = '@message';
  const totalDocCount = 14005;
  const cases = getService('cases');

  describe('log pattern analysis in cases', function () {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'x-pack/platform/test/fixtures/es_archives/logstash_functional'
      );
      await ml.testResources.createDataViewIfNeeded('logstash-*', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.testResources.deleteDataViewByTitle('logstash-*');
      await cases.api.deleteAllCases();
    });

    it('attaches log pattern analysis table to a case', async () => {
      // Start navigation from the base of the ML app.
      await ml.navigation.navigateToMl();
      await elasticChart.setNewChartUiDebugFlag(true);
      await aiops.logPatternAnalysisPage.navigateToDataViewSelection();
      await ml.jobSourceSelection.selectSourceForLogPatternAnalysisDetection('logstash-*');
      await aiops.logPatternAnalysisPage.assertLogPatternAnalysisPageExists();

      await aiops.logPatternAnalysisPage.clickUseFullDataButton(totalDocCount);
      await aiops.logPatternAnalysisPage.selectCategoryField(selectedField);
      await aiops.logPatternAnalysisPage.clickRunButton();

      const caseParams = {
        title: 'ML Log pattern analysis case',
        description: 'Case with a log pattern analysis attachment',
        tag: 'ml_log_pattern_analysis',
        reporter: USER.ML_POWERUSER,
      };

      await aiops.logPatternAnalysisPage.attachToCase(caseParams);

      await ml.cases.assertCaseWithLogPatternAnalysisAttachment(caseParams);
    });
  });
}
