/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('machine learning - data visualizer - group1', function () {
    this.tags(['skipFirefox', 'ml']);

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
    });

    after(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await ml.securityUI.logout();

      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();

      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/ml/farequote');
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/ml/module_sample_logs');

      await ml.testResources.resetKibanaTimeZone();
    });
    loadTestFile(require.resolve('./index_data_visualizer'));
    loadTestFile(require.resolve('./index_data_visualizer_random_sampler'));
    loadTestFile(require.resolve('./index_data_visualizer_filters'));
  });
}
