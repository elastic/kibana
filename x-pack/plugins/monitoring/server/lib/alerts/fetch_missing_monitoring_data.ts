/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { AlertCluster, AlertMissingData } from '../../../common/types/alerts';
import {
  KIBANA_SYSTEM_ID,
  BEATS_SYSTEM_ID,
  APM_SYSTEM_ID,
  LOGSTASH_SYSTEM_ID,
  ELASTICSEARCH_SYSTEM_ID,
} from '../../../common/constants';

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
  _index: string;
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
        type: string;
      };
    };
  };
}

function getStackProductFromIndex(index: string, beatType: string) {
  if (index.includes('-kibana-')) {
    return KIBANA_SYSTEM_ID;
  }
  if (index.includes('-beats-')) {
    if (beatType === 'apm-server') {
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

export async function fetchMissingMonitoringData(
  callCluster: any,
  clusters: AlertCluster[],
  index: string,
  size: number,
  nowInMs: number,
  startMs: number
): Promise<AlertMissingData[]> {
  const endMs = nowInMs;

  const nameFields = [
    'kibana_stats.kibana.name',
    'logstash_stats.logstash.host',
    'beats_stats.beat.name',
    'beats_stats.beat.type',
    'source_node.name',
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
          includes: ['_index', ...nameFields],
        },
      },
    },
  };

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

    const uuidBuckets = [
      ...(clusterBucket.es_uuids?.buckets || []),
      ...(clusterBucket.kibana_uuids?.buckets || []),
      ...(clusterBucket.logstash_uuids?.buckets || []),
      ...(clusterBucket.beats?.beats_uuids.buckets || []),
      ...(clusterBucket.apms?.apm_uuids.buckets || []),
    ];

    for (const uuidBucket of uuidBuckets) {
      const stackProductUuid = uuidBucket.key;
      const indexName = get(uuidBucket, `document.hits.hits[0]._index`);
      const stackProduct = getStackProductFromIndex(
        indexName,
        get(uuidBucket, `document.hits.hits[0]._source.beats_stats.beat.type`)
      );
      const differenceInMs = nowInMs - uuidBucket.most_recent.value;
      let stackProductName = stackProductUuid;
      for (const nameField of nameFields) {
        stackProductName = get(uuidBucket, `document.hits.hits[0]._source.${nameField}`);
        if (stackProductName) {
          break;
        }
      }

      uniqueList[`${clusterUuid}${stackProduct}${stackProductUuid}`] = {
        stackProduct,
        stackProductUuid,
        stackProductName,
        clusterUuid,
        gapDuration: differenceInMs,
        ccs: indexName.includes(':') ? indexName.split(':')[0] : null,
      };
    }
  }

  const missingData = Object.values(uniqueList);
  return missingData;
}
