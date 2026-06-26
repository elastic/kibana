/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('machine learning - anomaly detection', function () {
    this.tags(['skipFirefox']);

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/ecommerce');
    });

    loadTestFile(require.resolve('./aggregated_scripted_job'));
    loadTestFile(require.resolve('./annotations'));
    loadTestFile(require.resolve('./anomaly_explorer'));
    loadTestFile(require.resolve('./forecasts'));
    loadTestFile(require.resolve('./single_metric_viewer'));
    loadTestFile(require.resolve('./rule_editor_flyout'));
  });
}
