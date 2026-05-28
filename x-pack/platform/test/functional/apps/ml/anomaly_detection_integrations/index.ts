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
    });

    loadTestFile(require.resolve('./anomaly_charts_dashboard_embeddables'));
    loadTestFile(require.resolve('./single_metric_viewer_dashboard_embeddables'));
    loadTestFile(require.resolve('./anomaly_embeddables_migration'));
    loadTestFile(require.resolve('./lens_to_ml'));
    loadTestFile(require.resolve('./map_to_ml'));
    loadTestFile(require.resolve('./lens_to_ml_with_wizard'));
  });
}
