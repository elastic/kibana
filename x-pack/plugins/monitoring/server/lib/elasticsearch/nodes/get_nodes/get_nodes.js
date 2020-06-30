/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { checkParam } from '../../../error_missing_required';
import { createQuery } from '../../../create_query';
import { calculateAuto } from '../../../calculate_auto';
import { ElasticsearchMetric } from '../../../metrics';
import { getMetricAggs } from './get_metric_aggs';
import { handleResponse } from './handle_response';
import { LISTING_METRICS_NAMES, LISTING_METRICS_PATHS } from './nodes_listing_metrics';

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
 * @param {Object} clusterStats: cluster stats from cluster state document
 * @param {Object} shardStats: per-node information about shards
 * @return {Array} node info combined with metrics for each node from handle_response
 */
export async function getNodes(req, esIndexPattern, pageOfNodes, clusterStats, nodesShardCount) {
  checkParam(esIndexPattern, 'esIndexPattern in getNodes');

  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const orgStart = start;
  const end = moment.utc(req.payload.timeRange.max).valueOf();
  const max = end;
  const duration = moment.duration(max - orgStart, 'ms');

  const config = req.server.config();
  const clusterUuid = req.params.clusterUuid;
  const metricFields = ElasticsearchMetric.getMetricFields();
  const min = start;

  const bucketSize = Math.max(
    config.get('monitoring.ui.min_interval_seconds'),
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

  const params = {
    index: esIndexPattern,
    size: config.get('monitoring.ui.max_bucket_size'),
    ignoreUnavailable: true,
    body: {
      query: createQuery({
        type: 'node_stats',
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
            size: config.get('monitoring.ui.max_bucket_size'),
          },
          aggs: {
            by_date: {
              date_histogram: {
                field: 'timestamp',
                min_doc_count: 0,
                fixed_interval: bucketSize + 's',
              },
              aggs: getMetricAggs(LISTING_METRICS_NAMES, bucketSize),
            },
          },
        },
      },
      sort: [{ timestamp: { order: 'desc' } }],
    },
    filterPath: [
      'hits.hits._source.source_node',
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
