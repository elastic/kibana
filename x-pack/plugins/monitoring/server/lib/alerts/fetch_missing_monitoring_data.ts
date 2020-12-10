/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { AlertCluster, AlertMissingData } from '../../../common/types/alerts';

interface ClusterBucketESResponse {
  key: string;
  es_uuids: UuidResponse;
}

interface UuidResponse {
  buckets: UuidBucketESResponse[];
}

interface UuidBucketESResponse {
  key: string;
  most_recent: {
    value: number;
  };
  document: {
    hits: {
      hits: TopHitESResponse[];
    };
  };
}

interface TopHitESResponse {
  _index: string;
  _source: {
    source_node?: {
      name: string;
    };
  };
}

// TODO: only Elasticsearch until we can figure out how to handle upgrades for the rest of the stack
// https://github.com/elastic/kibana/issues/83309
export async function fetchMissingMonitoringData(
  callCluster: any,
  clusters: AlertCluster[],
  index: string,
  size: number,
  nowInMs: number,
  startMs: number
): Promise<AlertMissingData[]> {
  const endMs = nowInMs;
  const params = {
    index,
    filterPath: ['aggregations.clusters.buckets'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: {
                cluster_uuid: clusters.map((cluster) => cluster.clusterUuid),
              },
            },
            {
              range: {
                timestamp: {
                  format: 'epoch_millis',
                  gte: startMs,
                  lte: endMs,
                },
              },
            },
          ],
        },
      },
      aggs: {
        clusters: {
          terms: {
            field: 'cluster_uuid',
            size,
          },
          aggs: {
            es_uuids: {
              terms: {
                field: 'node_stats.node_id',
                size,
              },
              aggs: {
                most_recent: {
                  max: {
                    field: 'timestamp',
                  },
                },
                document: {
                  top_hits: {
                    size: 1,
                    sort: [
                      {
                        timestamp: {
                          order: 'desc',
                        },
                      },
                    ],
                    _source: {
                      includes: ['_index', 'source_node.name'],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const response = await callCluster('search', params);
  const clusterBuckets = get(
    response,
    'aggregations.clusters.buckets',
    []
  ) as ClusterBucketESResponse[];
  const uniqueList: { [id: string]: AlertMissingData } = {};
  for (const clusterBucket of clusterBuckets) {
    const clusterUuid = clusterBucket.key;
    const uuidBuckets = clusterBucket.es_uuids.buckets;

    for (const uuidBucket of uuidBuckets) {
      const nodeId = uuidBucket.key;
      const indexName = get(uuidBucket, `document.hits.hits[0]._index`);
      const differenceInMs = nowInMs - uuidBucket.most_recent.value;
      const nodeName = get(uuidBucket, `document.hits.hits[0]._source.source_node.name`, nodeId);

      uniqueList[`${clusterUuid}${nodeId}`] = {
        nodeId,
        nodeName,
        clusterUuid,
        gapDuration: differenceInMs,
        ccs: indexName.includes(':') ? indexName.split(':')[0] : null,
      };
    }
  }

  const missingData = Object.values(uniqueList);
  return missingData;
}
