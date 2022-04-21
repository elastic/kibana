/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { createQuery } from '../../../create_query';
import { calculateAuto } from '../../../calculate_auto';
import { ElasticsearchMetric } from '../../../metrics';
import { getMetricAggs } from './get_metric_aggs';
import { handleResponse } from './handle_response';
import { LISTING_METRICS_NAMES, LISTING_METRICS_PATHS } from './nodes_listing_metrics';
import { LegacyRequest } from '../../../../types';
import { ElasticsearchModifiedSource } from '../../../../../common/types/es';
import { getNewIndexPatterns } from '../../../cluster/get_index_patterns';
import { Globals } from '../../../../static_globals';

/* Run an aggregation on node_stats to get stat data for the selected time
 * range for all the active nodes.  Every option is a key to a configuration
 * value in server/lib/metrics. Those options are used to build up a query with
 * a bunch of date histograms.
 *
 * Returns array of objects for every node, it has a Node Name, Node Transport
 * Address, the Data and Master Attributes for each node The Node IDs are used
 * only for determining if the node is a Master node. Time-based metric data is
 * included that adds information such as CPU and JVM stats.
 *
 * @param {Object} req: server request object
 * @param {String} esIndexPattern: index pattern for elasticsearch data in monitoring indices
 * @param {Object} pageOfNodes: server-side paginated current page of ES nodes
 * @param {Object} clusterStats: cluster stats from cluster state document
 * @param {Object} nodesShardCount: per-node information about shards
 * @return {Array} node info combined with metrics for each node from handle_response
 */
export async function getNodes(
  req: LegacyRequest,
  pageOfNodes: Array<{ uuid: string }>,
  clusterStats: ElasticsearchModifiedSource,
  nodesShardCount: { nodes: { [nodeId: string]: { shardCount: number } } }
) {
  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const orgStart = start;
  const end = moment.utc(req.payload.timeRange.max).valueOf();
  const max = end;
  const duration = moment.duration(max - orgStart, 'ms');

  const config = req.server.config;
  const clusterUuid = req.params.clusterUuid;
  const metricFields = ElasticsearchMetric.getMetricFields();
  const min = start;

  const bucketSize = Math.max(
    config.ui.min_interval_seconds,
    calculateAuto(100, duration).asSeconds()
  );

  const uuidsToInclude = pageOfNodes.map((node) => node.uuid);
  const filters = [
    {
      terms: {
        'source_node.uuid': uuidsToInclude,
      },
    },
  ];

  const dataset = 'node_stats';
  const moduleType = 'elasticsearch';
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    ccs: req.payload.ccs,
    moduleType,
    dataset,
  });

  const maxBucketSize = config.ui.max_bucket_size;

  const params = {
    index: indexPatterns,
    size: maxBucketSize,
    ignore_unavailable: true,
    body: {
      query: createQuery({
        type: dataset,
        dsDataset: `${moduleType}.${dataset}`,
        metricset: dataset,
        start,
        end,
        clusterUuid,
        filters,
        metric: metricFields,
      }),
      collapse: {
        field: 'source_node.uuid',
      },
      aggs: {
        nodes: {
          terms: {
            field: `source_node.uuid`,
            include: uuidsToInclude,
            size: maxBucketSize,
          },
          aggs: {
            by_date: {
              date_histogram: {
                field: 'timestamp',
                min_doc_count: 0,
                fixed_interval: bucketSize + 's',
              },
              aggs: getMetricAggs(LISTING_METRICS_NAMES),
            },
          },
        },
      },
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
    },
    filter_path: [
      'hits.hits._source.source_node',
      'hits.hits._source.service.address',
      'hits.hits._source.elasticsearch.node',
      'aggregations.nodes.buckets.key',
      ...LISTING_METRICS_PATHS,
    ],
  };
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);

  return handleResponse(response, clusterStats, nodesShardCount, pageOfNodes, {
    min,
    max,
    bucketSize,
  });
}
