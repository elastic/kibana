/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const config = getService('config');
  describe('rollup app', function () {
    // Only the CCS variant remains, deferred until Scout supports remote-cluster topology
    // (#281791); all non-CCS coverage moved to Scout (`test/scout/ui`).
    if (config.get('esTestCluster.ccs')) {
      loadTestFile(require.resolve('./rollup_jobs'));
    }
  });
}
