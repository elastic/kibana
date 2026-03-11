/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('Monitoring app (part 2)', function () {
    loadTestFile(require.resolve('./elasticsearch/shards'));
    // loadTestFile(require.resolve('./elasticsearch/shard_activity'));

    loadTestFile(require.resolve('./kibana/overview'));
    loadTestFile(require.resolve('./kibana/overview_mb'));
    loadTestFile(require.resolve('./kibana/instances'));
    loadTestFile(require.resolve('./kibana/instances_mb'));
    loadTestFile(require.resolve('./kibana/instance'));
    loadTestFile(require.resolve('./kibana/instance_mb'));

    loadTestFile(require.resolve('./logstash/overview'));
    loadTestFile(require.resolve('./logstash/overview_mb'));
    loadTestFile(require.resolve('./logstash/nodes'));
    loadTestFile(require.resolve('./logstash/nodes_mb'));
    loadTestFile(require.resolve('./logstash/pipelines'));
    loadTestFile(require.resolve('./logstash/pipelines_mb'));
    loadTestFile(require.resolve('./logstash/pipeline_viewer'));
    loadTestFile(require.resolve('./logstash/pipeline_viewer_mb'));
  });
}
