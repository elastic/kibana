/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('Monitoring app - group 2', function () {
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
    loadTestFile(require.resolve('./logstash/node_detail'));
    loadTestFile(require.resolve('./logstash/node_detail_mb'));

    loadTestFile(require.resolve('./beats/cluster'));
    loadTestFile(require.resolve('./beats/overview'));
    loadTestFile(require.resolve('./beats/listing'));
    loadTestFile(require.resolve('./beats/beat_detail'));

    loadTestFile(require.resolve('./enterprise_search/cluster'));
    loadTestFile(require.resolve('./enterprise_search/overview'));

    loadTestFile(require.resolve('./time_filter'));
    loadTestFile(require.resolve('./enable_monitoring'));

    loadTestFile(require.resolve('./setup/metricbeat_migration'));
    loadTestFile(require.resolve('./setup/metricbeat_migration_mb'));
  });
}
