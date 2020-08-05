/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { get } from 'lodash';
import { ElasticsearchMetric } from '../../../metrics';
import { createQuery } from '../../../create_query';

export async function getNodeIds(req, indexPattern, { clusterUuid }, size) {
  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();

  const params = {
    index: indexPattern,
    size: 0,
    ignoreUnavailable: true,
    filterPath: ['aggregations.composite_data.buckets'],
    body: {
      query: createQuery({
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
  return get(response, 'aggregations.composite_data.buckets', []).map((bucket) => bucket.key);
}
