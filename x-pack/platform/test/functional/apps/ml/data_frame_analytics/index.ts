/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('machine learning - data frame analytics', function () {
    this.tags(['ml']);

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
    });

    after(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await ml.securityUI.logout();

      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();

      await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote_small');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/bm_classification');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/egs_regression');

      await ml.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./outlier_detection_creation'));
    loadTestFile(require.resolve('./regression_creation'));
    loadTestFile(require.resolve('./classification_creation'));
    loadTestFile(require.resolve('./cloning'));
    loadTestFile(require.resolve('./results_view_content'));
    loadTestFile(require.resolve('./regression_creation_saved_search'));
    loadTestFile(require.resolve('./classification_creation_saved_search'));
    loadTestFile(require.resolve('./outlier_detection_creation_saved_search'));
    loadTestFile(require.resolve('./custom_urls'));
  });
}
