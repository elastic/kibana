/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, uniq } from 'lodash';
import {
  METRICBEAT_INDEX_NAME_UNIQUE_TOKEN,
  ELASTICSEARCH_SYSTEM_ID,
  APM_SYSTEM_ID,
  KIBANA_SYSTEM_ID,
  BEATS_SYSTEM_ID,
  LOGSTASH_SYSTEM_ID,
  KIBANA_STATS_TYPE_MONITORING,
} from '../../../../common/constants';
import { getLivesNodes } from '../../elasticsearch/nodes/get_nodes/get_live_nodes';

const NUMBER_OF_SECONDS_AGO_TO_LOOK = 30;

const getRecentMonitoringDocuments = async (req, indexPatterns, clusterUuid, nodeUuid, size) => {
  const start = get(req.payload, 'timeRange.min') || `now-${NUMBER_OF_SECONDS_AGO_TO_LOOK}s`;
  const end = get(req.payload, 'timeRange.max') || 'now';

  const filters = [
    {
      range: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
    },
  ];

  if (clusterUuid) {
    filters.push({ term: { cluster_uuid: clusterUuid } });
  }

  const nodesClause = [];
  if (nodeUuid) {
    nodesClause.push({
      bool: {
        should: [
          { term: { 'node_stats.node_id': nodeUuid } },
          { term: { 'kibana_stats.kibana.uuid': nodeUuid } },
          { term: { 'beats_stats.beat.uuid': nodeUuid } },
          { term: { 'logstash_stats.logstash.uuid': nodeUuid } },
        ],
      },
    });
  }

  const params = {
    index: Object.values(indexPatterns),
    size: 0,
    ignoreUnavailable: true,
    filterPath: ['aggregations.indices.buckets'],
    body: {
      query: {
        bool: {
          filter: filters,
          must: nodesClause,
        },
      },
      aggs: {
        indices: {
          terms: {
            field: '_index',
            size: 50,
          },
          aggs: {
            es_uuids: {
              terms: {
                field: 'node_stats.node_id',
                size,
              },
              aggs: {
                by_timestamp: {
                  max: {
                    field: 'timestamp',
                  },
                },
              },
            },
            kibana_uuids: {
              terms: {
                field: 'kibana_stats.kibana.uuid',
                size,
              },
              aggs: {
                by_timestamp: {
                  max: {
                    field: 'timestamp',
                  },
                },
              },
            },
            beats_uuids: {
              terms: {
                field: 'beats_stats.beat.uuid',
                size,
              },
              aggs: {
                by_timestamp: {
                  max: {
                    field: 'timestamp',
                  },
                },
                beat_type: {
                  terms: {
                    field: 'beats_stats.beat.type',
                    size,
                  },
                },
                cluster_uuid: {
                  terms: {
                    field: 'cluster_uuid',
                    size,
                  },
                },
              },
            },
            logstash_uuids: {
              terms: {
                field: 'logstash_stats.logstash.uuid',
                size,
              },
              aggs: {
                by_timestamp: {
                  max: {
                    field: 'timestamp',
                  },
                },
                cluster_uuid: {
                  terms: {
                    field: 'cluster_uuid',
                    size,
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return await callWithRequest(req, 'search', params);
};

async function doesIndexExist(req, index) {
  const params = {
    index,
    size: 0,
    terminate_after: 1,
    ignoreUnavailable: true,
    filterPath: ['hits.total.value'],
  };
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);
  return get(response, 'hits.total.value', 0) > 0;
}

async function detectProducts(req, isLiveCluster) {
  const result = {
    [KIBANA_SYSTEM_ID]: {
      doesExist: true,
    },
    [ELASTICSEARCH_SYSTEM_ID]: {
      doesExist: true,
    },
    [BEATS_SYSTEM_ID]: {
      mightExist: false,
    },
    [APM_SYSTEM_ID]: {
      mightExist: false,
    },
    [LOGSTASH_SYSTEM_ID]: {
      mightExist: false,
    },
  };

  const detectionSearch = [
    {
      id: BEATS_SYSTEM_ID,
      indices: ['*beat-*', '.management-beats*'],
    },
    {
      id: LOGSTASH_SYSTEM_ID,
      indices: ['logstash-*', '.logstash*'],
    },
    {
      id: APM_SYSTEM_ID,
      indices: ['apm-*'],
    },
  ];

  if (isLiveCluster) {
    for (const { id, indices } of detectionSearch) {
      const exists = await doesIndexExist(req, indices.join(','));
      if (exists) {
        result[id].mightExist = true;
      }
    }
  }

  return result;
}

function getUuidBucketName(productName) {
  switch (productName) {
    case ELASTICSEARCH_SYSTEM_ID:
      return 'es_uuids';
    case KIBANA_SYSTEM_ID:
      return 'kibana_uuids';
    case BEATS_SYSTEM_ID:
    case APM_SYSTEM_ID:
      return 'beats_uuids';
    case LOGSTASH_SYSTEM_ID:
      return 'logstash_uuids';
  }
}

function isBeatFromAPM(bucket) {
  const beatType = get(bucket, 'beat_type');
  if (!beatType) {
    return false;
  }

  return get(beatType, 'buckets[0].key') === 'apm-server';
}

async function hasNecessaryPermissions(req) {
  try {
    const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
    const response = await callWithRequest(req, 'transport.request', {
      method: 'POST',
      path: '/_security/user/_has_privileges',
      body: {
        cluster: ['monitor'],
      },
    });
    // If there is some problem, assume they do not have access
    return get(response, 'has_all_requested', false);
  } catch (err) {
    if (
      err.message === 'no handler found for uri [/_security/user/_has_privileges] and method [POST]'
    ) {
      return true;
    }
    return false;
  }
}

/**
 * Determines if we should ignore this bucket from this product.
 *
 * We need this logic because APM and Beats are separate products, but their
 * monitoring data appears in the same index (.monitoring-beats-*) and the single
 * way to determine the difference between two documents in that index
 * is `beats_stats.beat.type` which we are performing a terms agg in the above query.
 * If that value is `apm-server` and we're attempting to calculating status for beats
 * we need to ignore that data from that particular  bucket.
 *
 * @param {*} product The product object, which are stored in PRODUCTS
 * @param {*} bucket The agg bucket in the response
 */
function shouldSkipBucket(product, bucket) {
  if (product.name === BEATS_SYSTEM_ID && isBeatFromAPM(bucket)) {
    return true;
  }
  if (product.name === APM_SYSTEM_ID && !isBeatFromAPM(bucket)) {
    return true;
  }
  return false;
}

async function getLiveKibanaInstance(usageCollection) {
  if (!usageCollection) {
    return null;
  }
  const kibanaStatsCollector = usageCollection.getCollectorByType(KIBANA_STATS_TYPE_MONITORING);
  if (!(await kibanaStatsCollector.isReady())) {
    return null;
  }
  return usageCollection.toApiFieldNames(await kibanaStatsCollector.fetch());
}

async function getLiveElasticsearchClusterUuid(req) {
  const params = {
    path: '/_cluster/state/cluster_uuid',
    method: 'GET',
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
  const { cluster_uuid: clusterUuid } = await callWithRequest(req, 'transport.request', params);
  return clusterUuid;
}

async function getLiveElasticsearchCollectionEnabled(req) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const response = await callWithRequest(req, 'transport.request', {
    method: 'GET',
    path: '/_cluster/settings?include_defaults',
    filter_path: [
      'persistent.xpack.monitoring',
      'transient.xpack.monitoring',
      'defaults.xpack.monitoring',
    ],
  });
  const sources = ['persistent', 'transient', 'defaults'];
  for (const source of sources) {
    const collectionSettings = get(response[source], 'xpack.monitoring.elasticsearch.collection');
    if (collectionSettings && collectionSettings.enabled === 'true') {
      return true;
    }
  }
  return false;
}

/**
 * This function will scan all monitoring documents within the past 30s (or a custom time range is supported too)
 * and determine which products fall into one of four states:
 * - isNetNewUser: This means we have detected this instance without monitoring and know that monitoring isn't connected to it. This is really only applicable to ES nodes from the same cluster Kibana is talking to.
 * - isPartiallyMigrated: This means we are seeing some monitoring documents from MB and some from internal collection
 * - isFullyMigrated: This means we are only seeing monitoring documents from MB
 * - isInternalCollector: This means we are only seeing monitoring documents from internal collection
 *
 * If a product is partially migrated, this function will also return the timestamp of the last seen monitoring
 * document from internal collection. This will help the user understand if they successfully disabled internal
 * collection and just need to wait for the time window of the query to exclude the older, internally collected documents
 *
 * If a product is not detected at all (no monitoring documents), we will attempt to do some self discovery
 * based on assumptions around indices that might exist with various products. We will return something
 * like this in that case:
 * detected: {
 *   doesExist: boolean, // This product definitely exists but does not have any monitoring documents (kibana and ES)
 *   mightExist: boolean, // This product might exist based on the presence of some other indices
 * }

 * @param {*} req Standard request object. Can contain a timeRange to use for the query
 * @param {*} indexPatterns Map of index patterns to search against (will be all .monitoring-* indices)
 * @param {*} clusterUuid Optional and will be used to filter down the query if used
 * @param {*} nodeUuid Optional and will be used to filter down the query if used
 * @param {*} skipLiveData Optional and will not make any live api calls if set to true
 */
export const getCollectionStatus = async (
  req,
  indexPatterns,
  clusterUuid,
  nodeUuid,
  skipLiveData
) => {
  const config = req.server.config();
  const kibanaUuid = config.get('server.uuid');
  const size = config.get('monitoring.ui.max_bucket_size');
  const hasPermissions = await hasNecessaryPermissions(req);

  if (!hasPermissions) {
    return {
      _meta: {
        hasPermissions: false,
      },
    };
  }
  const liveClusterUuid = skipLiveData ? null : await getLiveElasticsearchClusterUuid(req);
  const isLiveCluster = !clusterUuid || liveClusterUuid === clusterUuid;

  const PRODUCTS = [
    { name: KIBANA_SYSTEM_ID },
    { name: BEATS_SYSTEM_ID },
    { name: LOGSTASH_SYSTEM_ID },
    { name: APM_SYSTEM_ID, token: '-beats-' },
    { name: ELASTICSEARCH_SYSTEM_ID, token: '-es-' },
  ];

  const [recentDocuments, detectedProducts] = await Promise.all([
    await getRecentMonitoringDocuments(req, indexPatterns, clusterUuid, nodeUuid, size),
    await detectProducts(req, isLiveCluster),
  ]);

  const liveEsNodes = skipLiveData || !isLiveCluster ? [] : await getLivesNodes(req);
  const { usageCollection } = req.server.newPlatform.setup.plugins;
  const liveKibanaInstance =
    skipLiveData || !isLiveCluster ? {} : await getLiveKibanaInstance(usageCollection);
  const indicesBuckets = get(recentDocuments, 'aggregations.indices.buckets', []);
  const liveClusterInternalCollectionEnabled = await getLiveElasticsearchCollectionEnabled(req);

  const status = PRODUCTS.reduce((products, product) => {
    const token = product.token || product.name;
    const indexBuckets = indicesBuckets.filter((bucket) => bucket.key.includes(token));
    const uuidBucketName = getUuidBucketName(product.name);

    const productStatus = {
      totalUniqueInstanceCount: 0,
      totalUniqueInternallyCollectedCount: 0,
      totalUniqueFullyMigratedCount: 0,
      totalUniquePartiallyMigratedCount: 0,
      detected: null,
      byUuid: {},
    };

    const fullyMigratedUuidsMap = {};
    const internalCollectorsUuidsMap = {};
    const partiallyMigratedUuidsMap = {};

    // If there is no data, then they are a net new user
    if (!indexBuckets || indexBuckets.length === 0) {
      productStatus.totalUniqueInstanceCount = 0;
    }
    // If there is a single bucket, then they are fully migrated or fully on the internal collector
    else if (indexBuckets.length === 1) {
      const singleIndexBucket = indexBuckets[0];
      const isFullyMigrated = singleIndexBucket.key.includes(METRICBEAT_INDEX_NAME_UNIQUE_TOKEN);

      const map = isFullyMigrated ? fullyMigratedUuidsMap : internalCollectorsUuidsMap;
      const uuidBuckets = get(singleIndexBucket, `${uuidBucketName}.buckets`, []);
      for (const bucket of uuidBuckets) {
        if (shouldSkipBucket(product, bucket)) {
          continue;
        }
        const { key, by_timestamp: byTimestamp } = bucket;
        if (!map[key]) {
          map[key] = { lastTimestamp: get(byTimestamp, 'value') };
          if (product.name === KIBANA_SYSTEM_ID && key === kibanaUuid) {
            map[key].isPrimary = true;
          }
          if (product.name === BEATS_SYSTEM_ID) {
            map[key].beatType = get(bucket.beat_type, 'buckets[0].key');
          }
          if (bucket.cluster_uuid) {
            map[key].clusterUuid = get(bucket.cluster_uuid, 'buckets[0].key', '') || null;
          }
        }
      }
      productStatus.totalUniqueInstanceCount = Object.keys(map).length;
      productStatus.totalUniqueInternallyCollectedCount = Object.keys(
        internalCollectorsUuidsMap
      ).length;
      productStatus.totalUniquePartiallyMigratedCount = Object.keys(
        partiallyMigratedUuidsMap
      ).length;
      productStatus.totalUniqueFullyMigratedCount = Object.keys(fullyMigratedUuidsMap).length;
      productStatus.byUuid = {
        ...productStatus.byUuid,
        ...Object.keys(internalCollectorsUuidsMap).reduce(
          (accum, uuid) => ({
            ...accum,
            [uuid]: {
              ...internalCollectorsUuidsMap[uuid],
              ...productStatus.byUuid[uuid],
              isInternalCollector: true,
              isNetNewUser: false,
            },
          }),
          {}
        ),
        ...Object.keys(partiallyMigratedUuidsMap).reduce(
          (accum, uuid) => ({
            ...accum,
            [uuid]: {
              ...partiallyMigratedUuidsMap[uuid],
              ...productStatus.byUuid[uuid],
              isPartiallyMigrated: true,
              isNetNewUser: false,
            },
          }),
          {}
        ),
        ...Object.keys(fullyMigratedUuidsMap).reduce(
          (accum, uuid) => ({
            ...accum,
            [uuid]: {
              ...fullyMigratedUuidsMap[uuid],
              ...productStatus.byUuid[uuid],
              isFullyMigrated: true,
              isNetNewUser: false,
            },
          }),
          {}
        ),
      };
    }
    // If there are multiple buckets, they are partially upgraded assuming a single mb index exists
    else {
      const considerAllInstancesMigrated =
        product.name === ELASTICSEARCH_SYSTEM_ID &&
        clusterUuid === liveClusterUuid &&
        !liveClusterInternalCollectionEnabled;
      const internalTimestamps = [];
      for (const indexBucket of indexBuckets) {
        const isFullyMigrated =
          considerAllInstancesMigrated ||
          indexBucket.key.includes(METRICBEAT_INDEX_NAME_UNIQUE_TOKEN);
        const map = isFullyMigrated ? fullyMigratedUuidsMap : internalCollectorsUuidsMap;
        const otherMap = !isFullyMigrated ? fullyMigratedUuidsMap : internalCollectorsUuidsMap;

        const uuidBuckets = get(indexBucket, `${uuidBucketName}.buckets`, []);
        for (const bucket of uuidBuckets) {
          if (shouldSkipBucket(product, bucket)) {
            continue;
          }

          const { key, by_timestamp: byTimestamp } = bucket;
          if (!map[key]) {
            if (otherMap[key]) {
              partiallyMigratedUuidsMap[key] = otherMap[key] || {};
              delete otherMap[key];
            } else {
              map[key] = {};
              if (product.name === KIBANA_SYSTEM_ID && key === kibanaUuid) {
                map[key].isPrimary = true;
              }
              if (product.name === BEATS_SYSTEM_ID) {
                map[key].beatType = get(bucket.beat_type, 'buckets[0].key');
              }
              if (bucket.cluster_uuid) {
                map[key].clusterUuid = get(bucket.cluster_uuid, 'buckets[0].key', '') || null;
              }
            }
          }
          if (!isFullyMigrated) {
            internalTimestamps.push(byTimestamp.value);
          }
        }
      }

      productStatus.totalUniqueInstanceCount = uniq([
        ...Object.keys(internalCollectorsUuidsMap),
        ...Object.keys(fullyMigratedUuidsMap),
        ...Object.keys(partiallyMigratedUuidsMap),
      ]).length;
      productStatus.totalUniqueInternallyCollectedCount = Object.keys(
        internalCollectorsUuidsMap
      ).length;
      productStatus.totalUniquePartiallyMigratedCount = Object.keys(
        partiallyMigratedUuidsMap
      ).length;
      productStatus.totalUniqueFullyMigratedCount = Object.keys(fullyMigratedUuidsMap).length;
      productStatus.byUuid = {
        ...productStatus.byUuid,
        ...Object.keys(internalCollectorsUuidsMap).reduce(
          (accum, uuid) => ({
            ...accum,
            [uuid]: {
              ...internalCollectorsUuidsMap[uuid],
              ...productStatus.byUuid[uuid],
              isInternalCollector: true,
              isNetNewUser: false,
            },
          }),
          {}
        ),
        ...Object.keys(partiallyMigratedUuidsMap).reduce(
          (accum, uuid) => ({
            ...accum,
            [uuid]: {
              ...partiallyMigratedUuidsMap[uuid],
              ...productStatus.byUuid[uuid],
              isPartiallyMigrated: true,
              lastInternallyCollectedTimestamp: internalTimestamps[0],
              isNetNewUser: false,
            },
          }),
          {}
        ),
        ...Object.keys(fullyMigratedUuidsMap).reduce(
          (accum, uuid) => ({
            ...accum,
            [uuid]: {
              ...fullyMigratedUuidsMap[uuid],
              ...productStatus.byUuid[uuid],
              isFullyMigrated: true,
              isNetNewUser: false,
            },
          }),
          {}
        ),
      };
    }

    if (productStatus.totalUniqueInstanceCount === 0) {
      productStatus.detected = detectedProducts[product.name];
    }

    if (product.name === ELASTICSEARCH_SYSTEM_ID && liveEsNodes.length) {
      productStatus.byUuid = liveEsNodes.reduce((byUuid, esNode) => {
        if (!byUuid[esNode.id]) {
          productStatus.totalUniqueInstanceCount++;
          return {
            ...byUuid,
            [esNode.id]: {
              node: esNode,
              isNetNewUser: true,
            },
          };
        }
        return byUuid;
      }, productStatus.byUuid);
    }

    if (product.name === KIBANA_SYSTEM_ID && liveKibanaInstance) {
      const kibanaLiveUuid = get(liveKibanaInstance, 'kibana.uuid');
      if (kibanaLiveUuid && !productStatus.byUuid[kibanaLiveUuid]) {
        productStatus.totalUniqueInstanceCount++;
        productStatus.byUuid = {
          [kibanaLiveUuid]: {
            instance: liveKibanaInstance,
            isNetNewUser: true,
          },
        };
      }
    }

    return {
      ...products,
      [product.name]: productStatus,
    };
  }, {});

  status._meta = {
    secondsAgo: NUMBER_OF_SECONDS_AGO_TO_LOOK,
    liveClusterUuid,
    hasPermissions,
  };

  return status;
};
