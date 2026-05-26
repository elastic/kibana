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
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');
    });

    loadTestFile(require.resolve('./index_data_visualizer_grid_in_discover'));
    loadTestFile(require.resolve('./index_data_visualizer_grid_in_discover_trial'));
    loadTestFile(require.resolve('./index_data_visualizer_grid_in_dashboard'));
  });
}
