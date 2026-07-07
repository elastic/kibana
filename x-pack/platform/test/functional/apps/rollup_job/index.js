/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile, getService }) {
  const config = getService('config');
  describe('rollup app', function () {
    loadTestFile(require.resolve('./rollup_jobs'));
    if (!config.get('esTestCluster.ccs')) {
      loadTestFile(require.resolve('./hybrid_index_pattern'));
      loadTestFile(require.resolve('./tsvb'));
    }
  });
}
