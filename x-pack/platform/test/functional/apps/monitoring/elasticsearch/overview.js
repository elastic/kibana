/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from '../_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const clusterOverview = getService('monitoringClusterOverview');
  const overview = getService('monitoringElasticsearchOverview');
  const esClusterSummaryStatus = getService('monitoringElasticsearchSummaryStatus');

  describe('Elasticsearch overview', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup(
        'x-pack/test/functional/es_archives/monitoring/singlecluster_three_nodes_shard_relocation',
        {
          from: 'Oct 5, 2017 @ 20:31:48.354',
          to: 'Oct 5, 2017 @ 20:35:30.176',
        }
      );

      await clusterOverview.closeAlertsModal();

      // go to overview
      await clusterOverview.clickEsOverview();
      expect(await overview.isOnOverview()).to.be(true);
    });

    after(async () => {
      await tearDown();
    });

    it('should have an Elasticsearch Cluster Summary Status with correct info', async () => {
      expect(await esClusterSummaryStatus.getContent()).to.eql({
        nodesCount: 'Nodes\n3',
        indicesCount: 'Indices\n21',
        memory: 'JVM Heap\n629.3 MB / 2.0 GB',
        totalShards: 'Total shards\n82',
        unassignedShards: 'Unassigned shards\n5',
        documentCount: 'Documents\n26,062',
        dataSize: 'Data\n101.9 MB',
        health: 'Health: yellow',
      });
    });

    it('should show the link to view more cluster logs', async () => {
      expect(await esClusterSummaryStatus.viewLogsLinkIsShowing()).to.be(true);
    });
  });
}
