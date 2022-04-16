/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { get } from 'lodash';
import { AlertCluster, AlertMissingData } from '../../../common/types/alerts';
import { Globals } from '../../static_globals';
import { getConfigCcs } from '../../../common/ccs_utils';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';
import { createDatasetFilter } from './create_dataset_query_filter';

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
  esClient: ElasticsearchClient,
  clusters: AlertCluster[],
  size: number,
  nowInMs: number,
  startMs: number,
  filterQuery?: string
): Promise<AlertMissingData[]> {
  const endMs = nowInMs;
  // changing this to only search ES because of changes related to https://github.com/elastic/kibana/issues/83309
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType: 'elasticsearch',
    dataset: 'node_stats',
    ccs: getConfigCcs(Globals.app.config) ? '*' : undefined,
  });
  const params = {
    index: indexPatterns,
    filter_path: ['aggregations.clusters.buckets'],
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
            createDatasetFilter('node_stats', 'node_stats', 'elasticsearch.node_stats'),
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
                          order: 'desc' as const,
                          unmapped_type: 'long' as const,
                        },
                      },
                    ],
                    _source: {
                      includes: ['source_node.name', 'elasticsearch.node.name'],
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

  try {
    if (filterQuery) {
      const filterQueryObject = JSON.parse(filterQuery);
      params.body.query.bool.filter.push(filterQueryObject);
    }
  } catch (e) {
    // meh
  }

  const response = await esClient.search(params);
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
      const nodeName =
        get(uuidBucket, `document.hits.hits[0]._source.source_node.name`) ||
        get(uuidBucket, `document.hits.hits[0]._source.elasticsearch.node.name`) ||
        nodeId;

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
