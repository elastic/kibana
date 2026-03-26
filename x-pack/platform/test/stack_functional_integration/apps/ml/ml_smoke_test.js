/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ getService }) {
  describe('ML smoke test should check all the tabs', function mlSmokeTest() {
    const browser = getService('browser');
    const ml = getService('ml');

    before(async () => {
      await browser.setWindowSize(1200, 800);
      await ml.navigation.navigateToMl();
    });

    it('should display tabs in the ML app correctly', async () => {
      await ml.testExecution.logTestStep('should load the ML app');
      await ml.navigation.navigateToMl();

      await ml.testExecution.logTestStep('should display the enabled "Overview" tab');
      await ml.navigation.assertOverviewTabEnabled(true);

      await ml.testExecution.logTestStep('should display the enabled "Anomaly Detection" tab');
      await ml.navigation.assertAnomalyDetectionTabsEnabled(true);

      await ml.testExecution.logTestStep('should display the enabled "Data Frame Analytics" tab');
      await ml.navigation.assertDataFrameAnalyticsTabsEnabled(true);

      await ml.testExecution.logTestStep('should display the enabled "Data Visualizer" tab');
      await ml.navigation.assertDataVisualizerTabEnabled(true);
    });
  });
}
