/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('Monitoring app (part 1)', function () {
    loadTestFile(require.resolve('./feature_controls'));

    loadTestFile(require.resolve('./cluster/list'));
    loadTestFile(require.resolve('./cluster/list_mb'));
    loadTestFile(require.resolve('./cluster/overview'));
    // loadTestFile(require.resolve('./cluster/license'));

    loadTestFile(require.resolve('./elasticsearch/overview'));
    loadTestFile(require.resolve('./elasticsearch/overview_mb'));
    loadTestFile(require.resolve('./elasticsearch/nodes'));
    loadTestFile(require.resolve('./elasticsearch/nodes_mb'));
    loadTestFile(require.resolve('./elasticsearch/node_detail'));
    loadTestFile(require.resolve('./elasticsearch/node_detail_mb'));
    loadTestFile(require.resolve('./elasticsearch/indices'));
    loadTestFile(require.resolve('./elasticsearch/indices_mb'));
    loadTestFile(require.resolve('./elasticsearch/index_detail'));
    loadTestFile(require.resolve('./elasticsearch/index_detail_mb'));
  });
}
