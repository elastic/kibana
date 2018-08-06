/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { createQuery } from './create_query';
import { KIBANA_SYSTEM_ID, CANVAS_SYSTEM_ID } from '../../../../common/constants';

const canvasStatsPath = `${KIBANA_SYSTEM_ID}_stats.usage.xpack.${CANVAS_SYSTEM_ID}`;

export function fetchHighLevelCanvasStats(server, callCluster, clusterUuids, start, end) {
  const config = server.config();
  const params = {
    index: config.get(`xpack.monitoring.${KIBANA_SYSTEM_ID}.index_pattern`),
    size: config.get('xpack.monitoring.max_bucket_size'),
    ignoreUnavailable: true,
    body: {
      query: createQuery({
        start,
        end,
        type: `${KIBANA_SYSTEM_ID}_stats`, // canvas stats are in kibana_stats.xpack.canvas
        filters: [ { terms: { cluster_uuid: clusterUuids } } ]
      }),
      collapse: {
        field: 'cluster_uuid'
      },
      sort: [
        { 'timestamp': 'desc' }
      ],
      _source: {
        includes: [
          'cluster_uuid',
          canvasStatsPath,
        ]
      },
    }
  };

  return callCluster('search', params);
}

export function handleHighLevelCanvasStatsResponse(response) {
  const hits = get(response, 'hits.hits', []);
  return hits.reduce((accum, curr) => {
    const clusterUuid = get(curr, '_source.cluster_uuid');
    const stats = get(curr, `_source.${canvasStatsPath}`);
    return {
      ...accum,
      [clusterUuid]: stats
    };
  }, {});
}

export async function getCanvasStats(server, callCluster, clusterUuids, start, end) {
  const rawStats = await fetchHighLevelCanvasStats(server, callCluster, clusterUuids, start, end, CANVAS_SYSTEM_ID);
  const stats = handleHighLevelCanvasStatsResponse(rawStats);

  return stats;
}

