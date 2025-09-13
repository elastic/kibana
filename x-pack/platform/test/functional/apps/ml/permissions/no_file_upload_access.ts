/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { USER } from '../../../services/ml/security_common';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const testUsers = [{ user: USER.ML_POWERUSER_NO_FILE_UPLOAD, discoverAvailable: false }];

  describe('for user with full ML access', function () {
    this.tags(['skipFirefox', 'ml']);

    describe('with data loaded', function () {
      for (const testUser of testUsers) {
        describe(`(${testUser.user})`, function () {
          before(async () => {
            await ml.securityUI.loginAs(testUser.user);
          });
          after(async () => {
            // NOTE: Logout needs to happen before anything else to avoid flaky behavior
            await ml.securityUI.logout();
          });
          it('should display elements on ML Overview page correctly', async () => {
            await ml.testExecution.logTestStep('should load the ML Stack Management Overview page');
            await ml.navigation.navigateToStackManagementMlSection(
              'overview',
              'mlStackManagementOverviewPage'
            );
          });

          it('should display elements on Data Visualizer home page correctly', async () => {
            await ml.testExecution.logTestStep('should load the data visualizer page');
            await ml.navigation.navigateToDataVisualizer();
            await ml.testExecution.logTestStep(
              'should not display the "import data" card with enabled button'
            );
            await ml.dataVisualizer.assertDataVisualizerImportDataCardDoesNotExist();
          });

          it('should not find the file upload page', async () => {
            await ml.testExecution.logTestStep(
              'should load the data visualizer file selection page'
            );
            await ml.navigation.navigateToDataVisualizer();

            await ml.testExecution.logTestStep('should not display the file import page');
            await ml.dataVisualizer.navigateToFileUploadByPath();
            await ml.commonUI.assertAccessDenied();
          });
        });
      }
    });
  });
}
