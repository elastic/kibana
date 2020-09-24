/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { AlertCluster, AlertMissingData } from '../../alerts/types';
import {
  KIBANA_SYSTEM_ID,
  BEATS_SYSTEM_ID,
  APM_SYSTEM_ID,
  LOGSTASH_SYSTEM_ID,
  ELASTICSEARCH_SYSTEM_ID,
} from '../../../common/constants';

interface IndexBucketESResponse {
  key: string;
  clusters: {
    buckets: ClusterBucketESResponse[];
  };
}

interface ClusterBucketESResponse {
  key: string;
  kibana_uuids?: UuidResponse;
  logstash_uuids?: UuidResponse;
  es_uuids?: UuidResponse;
  beats?: {
    beats_uuids: UuidResponse;
  };
  apms?: {
    apm_uuids: UuidResponse;
  };
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
  _source: {
    source_node?: {
      name: string;
    };
    kibana_stats?: {
      kibana: {
        name: string;
      };
    };
    logstash_stats?: {
      logstash: {
        host: string;
      };
    };
    beats_stats?: {
      beat: {
        name: string;
      };
    };
  };
}

function findNonEmptyBucket(bucket: ClusterBucketESResponse): UuidResponse {
  if (bucket.beats && bucket.beats.beats_uuids.buckets.length > 0) {
    return bucket.beats.beats_uuids;
  }
  if (bucket.apms && bucket.apms.apm_uuids.buckets.length > 0) {
    return bucket.apms.apm_uuids;
  }
  if (bucket.kibana_uuids && bucket.kibana_uuids.buckets.length > 0) {
    return bucket.kibana_uuids;
  }
  if (bucket.logstash_uuids && bucket.logstash_uuids.buckets.length > 0) {
    return bucket.logstash_uuids;
  }
  if (bucket.es_uuids && bucket.es_uuids.buckets.length > 0) {
    return bucket.es_uuids;
  }
  return { buckets: [] };
}

function getStackProductFromIndex(index: string, bucket: ClusterBucketESResponse) {
  if (index.includes('-kibana-')) {
    return KIBANA_SYSTEM_ID;
  }
  if (index.includes('-beats-')) {
    if (bucket.apms && bucket.apms.apm_uuids.buckets.length > 0) {
      return APM_SYSTEM_ID;
    }
    return BEATS_SYSTEM_ID;
  }
  if (index.includes('-logstash-')) {
    return LOGSTASH_SYSTEM_ID;
  }
  if (index.includes('-es-')) {
    return ELASTICSEARCH_SYSTEM_ID;
  }
  return '';
}

export async function fetchMissingData(
  callCluster: any,
  clusters: AlertCluster[],
  index: string,
  limit: number,
  size: number,
  nowInMS: number
): Promise<AlertMissingData[]> {
  const endMs = nowInMS;
  const startMs = endMs - limit - limit * 0.25; // Go a bit farther back because we need to detect the difference between seeing the monitoring data versus just not looking far enough back

  const nameFields = [
    'source_node.name',
    'kibana_stats.kibana.name',
    'logstash_stats.logstash.host',
    'beats_stats.beat.name',
  ];
  const subAggs = {
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
          includes: nameFields,
        },
      },
    },
  };

  const params = {
    index,
    filterPath: ['aggregations.index.buckets'],
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
        index: {
          terms: {
            field: '_index',
            size,
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
                  aggs: subAggs,
                },
                kibana_uuids: {
                  terms: {
                    field: 'kibana_stats.kibana.uuid',
                    size,
                  },
                  aggs: subAggs,
                },
                beats: {
                  filter: {
                    bool: {
                      must_not: {
                        term: {
                          'beats_stats.beat.type': 'apm-server',
                        },
                      },
                    },
                  },
                  aggs: {
                    beats_uuids: {
                      terms: {
                        field: 'beats_stats.beat.uuid',
                        size,
                      },
                      aggs: subAggs,
                    },
                  },
                },
                apms: {
                  filter: {
                    bool: {
                      must: {
                        term: {
                          'beats_stats.beat.type': 'apm-server',
                        },
                      },
                    },
                  },
                  aggs: {
                    apm_uuids: {
                      terms: {
                        field: 'beats_stats.beat.uuid',
                        size,
                      },
                      aggs: subAggs,
                    },
                  },
                },
                logstash_uuids: {
                  terms: {
                    field: 'logstash_stats.logstash.uuid',
                    size,
                  },
                  aggs: subAggs,
                },
              },
            },
          },
        },
      },
    },
  };

  const response = await callCluster('search', params);
  const indexBuckets = get(response, 'aggregations.index.buckets', []) as IndexBucketESResponse[];
  const uniqueList: {
    [id: string]: AlertMissingData;
  } = {};
  for (const indexBucket of indexBuckets) {
    const clusterBuckets = indexBucket.clusters.buckets;
    for (const clusterBucket of clusterBuckets) {
      const clusterUuid = clusterBucket.key;
      const uuidBuckets = findNonEmptyBucket(clusterBucket).buckets;
      for (const uuidBucket of uuidBuckets) {
        const stackProductUuid = uuidBucket.key;
        const stackProduct = getStackProductFromIndex(indexBucket.key, clusterBucket);
        const differenceInMs = nowInMS - uuidBucket.most_recent.value;
        let stackProductName = stackProductUuid;
        for (const nameField of nameFields) {
          stackProductName = get(uuidBucket, `document.hits.hits[0]._source.${nameField}`);
          if (stackProductName) {
            break;
          }
        }

        uniqueList[`${clusterUuid}::${stackProduct}::${stackProductUuid}`] = {
          stackProduct,
          stackProductUuid,
          stackProductName,
          clusterUuid,
          gapDuration: differenceInMs,
          ccs: indexBucket.key.includes(':') ? indexBucket.key.split(':')[0] : null,
        };
      }
    }
  }

  const missingData = Object.values(uniqueList);
  return missingData;
}
