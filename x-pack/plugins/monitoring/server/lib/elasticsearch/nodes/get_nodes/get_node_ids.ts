/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { get } from 'lodash';
import { ElasticsearchMetric } from '../../../metrics';
import { createQuery } from '../../../create_query';
import { LegacyRequest, Bucket } from '../../../../types';
import { getNewIndexPatterns } from '../../../cluster/get_index_patterns';
import { Globals } from '../../../../static_globals';

export async function getNodeIds(
  req: LegacyRequest,
  { clusterUuid }: { clusterUuid: string },
  size: number
) {
  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();

  const dataset = 'node_stats';
  const moduleType = 'elasticsearch';
  const indexPattern = getNewIndexPatterns({
    config: Globals.app.config,
    ccs: req.payload.ccs,
    moduleType,
    dataset,
  });

  const params = {
    index: indexPattern,
    size: 0,
    ignore_unavailable: true,
    filter_path: ['aggregations.composite_data.buckets'],
    body: {
      query: createQuery({
        type: dataset,
        dsDataset: `${moduleType}.${dataset}`,
        metricset: dataset,
        start,
        end,
        metric: ElasticsearchMetric.getMetricFields(),
        clusterUuid,
      }),
      aggs: {
        composite_data: {
          composite: {
            size,
            sources: [
              {
                name: {
                  terms: {
                    field: 'source_node.name',
                  },
                },
              },
              {
                uuid: {
                  terms: {
                    field: 'source_node.uuid',
                  },
                },
              },
            ],
          },
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);
  return get(response, 'aggregations.composite_data.buckets', []).map(
    (bucket: Bucket) => bucket.key
  );
}
