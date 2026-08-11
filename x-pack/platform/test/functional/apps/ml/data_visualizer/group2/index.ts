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

  describe('machine learning - data visualizer - group2', function () {
    this.tags(['skipFirefox', 'ml']);

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');
    });

    loadTestFile(require.resolve('./index_data_visualizer_actions_panel'));
    loadTestFile(require.resolve('./index_data_visualizer_data_view_management'));
    loadTestFile(require.resolve('./file_data_visualizer'));
    loadTestFile(require.resolve('./data_drift'));
    loadTestFile(require.resolve('./esql_data_visualizer'));
  });
}
