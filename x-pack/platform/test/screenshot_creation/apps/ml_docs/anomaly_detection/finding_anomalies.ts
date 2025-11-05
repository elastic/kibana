/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

import { ECOMMERCE_INDEX_PATTERN } from '..';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const elasticChart = getService('elasticChart');
  const ml = getService('ml');
  const commonScreenshots = getService('commonScreenshots');
  const screenshotDirectories = ['ml_docs', 'anomaly_detection'];

  describe('finding anomalies', function () {
    after(async () => {
      await elasticChart.setNewChartUiDebugFlag(false);
      await ml.api.cleanMlIndices();
    });

    it('ecommerce job wizards screenshot', async () => {
      await ml.testExecution.logTestStep('navigate to job list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.testExecution.logTestStep('load the wizards');
      await ml.jobManagement.navigateToNewJobSourceSelection();
      await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(ECOMMERCE_INDEX_PATTERN);

      await ml.testExecution.logTestStep('take screenshot');
      await commonScreenshots.removeFocusFromElement();
      await commonScreenshots.takeScreenshot('ml-create-job', screenshotDirectories);
    });
  });
}
