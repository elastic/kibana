/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, uniq } from 'lodash';
import { METRICBEAT_INDEX_NAME_UNIQUE_TOKEN } from '../../../../common/constants';
import { KIBANA_SYSTEM_ID, BEATS_SYSTEM_ID, LOGSTASH_SYSTEM_ID, APM_SYSTEM_ID } from '../../../../../xpack_main/common/constants';

const getRecentMonitoringDocuments = async (req, indexPatterns, clusterUuid) => {
  const start = get(req.payload, 'timeRange.min', 'now-30s');
  const end = get(req.payload, 'timeRange.max', 'now');

  const filters = [
    {
      range: {
        'timestamp': {
          gte: start,
          lte: end
        }
      }
    }
  ];

  if (clusterUuid) {
    filters.push({ term: { 'cluster_uuid': clusterUuid } });
  }

  const params = {
    index: Object.values(indexPatterns),
    size: 0,
    ignoreUnavailable: true,
    filterPath: [
      'aggregations.indices.buckets'
    ],
    body: {
      query: {
        bool: {
          filter: filters,
        }
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
                field: 'node_stats.node_id'
              },
              aggs: {
                by_timestamp: {
                  max: {
                    field: 'timestamp'
                  }
                }
              }
            },
            kibana_uuids: {
              terms: {
                field: 'kibana_stats.kibana.uuid'
              },
              aggs: {
                by_timestamp: {
                  max: {
                    field: 'timestamp'
                  }
                }
              }
            },
            beats_uuids: {
              terms: {
                field: 'beats_stats.beat.uuid'
              },
              aggs: {
                by_timestamp: {
                  max: {
                    field: 'timestamp'
                  }
                }
              }
            },
            logstash_uuids: {
              terms: {
                field: 'logstash_stats.logstash.uuid'
              },
              aggs: {
                by_timestamp: {
                  max: {
                    field: 'timestamp'
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return await callWithRequest(req, 'search', params);
};

function getUuidBucketName(productName) {
  switch (productName) {
    case 'elasticsearch':
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

/**
 * This function will scan all monitoring documents within the past 30s (or a custom time range is supported too)
 * and determine which products fall into one of three states:
 * - isPartiallyMigrated: This means we are seeing some monitoring documents from MB and some from internal collection
 * - isFullyMigrated: This means we are only seeing monitoring documents from MB
 * - isInternalCollector: This means we are only seeing monitoring documents from internal collection
 *
 * If a product is partially migrated, this function will also return the timestamp of the last seen monitoring
 * document from internal collection. This will help the user understand if they successfully disabled internal
 * collection and just need to wait for the time window of the query to exclude the older, internally collected documents

 * @param {*} req Standard request object. Can contain a timeRange to use for the query
 * @param {*} indexPatterns Map of index patterns to search against (will be all .monitoring-* indices)
 * @param {*} clusterUuid Optional and will be used to filter down the query if used
 */
export const getCollectionStatus = async (req, indexPatterns, clusterUuid) => {
  const PRODUCTS = [
    { name: KIBANA_SYSTEM_ID },
    { name: BEATS_SYSTEM_ID },
    { name: LOGSTASH_SYSTEM_ID },
    { name: APM_SYSTEM_ID, token: '-beats-' },
    { name: 'elasticsearch', token: '-es-' },
  ];

  const recentDocuments = await getRecentMonitoringDocuments(req, indexPatterns, clusterUuid);
  const indicesBuckets = get(recentDocuments, 'aggregations.indices.buckets', []);

  const status = PRODUCTS.reduce((products, product) => {
    const token = product.token || product.name;
    const indexBuckets = indicesBuckets.filter(bucket => bucket.key.includes(token));
    const uuidBucketName = getUuidBucketName(product.name);

    const capabilities = {
      totalUniqueInstanceCount: 0,
      totalUniqueFullyMigratedCount: 0,
      byUuid: {},
    };

    const fullyMigratedUuidsMap = {};
    const internalCollectorsUuidsMap = {};
    const partiallyMigratedUuidsMap = {};

    // If there is no data, then they are a net new user
    if (!indexBuckets || indexBuckets.length === 0) {
      capabilities.totalUniqueInstanceCount = 0;
    }
    // If there is a single bucket, then they are fully migrated or fully on the internal collector
    else if (indexBuckets.length === 1) {
      const singleIndexBucket = indexBuckets[0];
      const isFullyMigrated = singleIndexBucket.key.includes(METRICBEAT_INDEX_NAME_UNIQUE_TOKEN);

      const map = isFullyMigrated ? fullyMigratedUuidsMap : internalCollectorsUuidsMap;
      const uuidBuckets = get(singleIndexBucket, `${uuidBucketName}.buckets`, []);
      for (const { key, by_timestamp: byTimestamp } of uuidBuckets) {
        if (!map[key]) {
          map[key] = { lastTimestamp: get(byTimestamp, 'value') };
        }
      }
      capabilities.totalUniqueInstanceCount = Object.keys(map).length;
      capabilities.totalUniqueFullyMigratedCount = Object.keys(fullyMigratedUuidsMap).length;
      capabilities.byUuid = {
        ...Object.keys(internalCollectorsUuidsMap).reduce((accum, uuid) => ({
          ...accum,
          [uuid]: { isInternalCollector: true, ...internalCollectorsUuidsMap[uuid] }
        }), {}),
        ...Object.keys(partiallyMigratedUuidsMap).reduce((accum, uuid) => ({
          ...accum,
          [uuid]: { isPartiallyMigrated: true, ...partiallyMigratedUuidsMap[uuid] }
        }), {}),
        ...Object.keys(fullyMigratedUuidsMap).reduce((accum, uuid) => ({
          ...accum,
          [uuid]: { isFullyMigrated: true, ...fullyMigratedUuidsMap[uuid] }
        }), {}),
      };
    }
    // If there are multiple buckets, they are partially upgraded assuming a single mb index exists
    else {
      const internalTimestamps = [];
      for (const indexBucket of indexBuckets) {
        const isFullyMigrated = indexBucket.key.includes(METRICBEAT_INDEX_NAME_UNIQUE_TOKEN);
        const map = isFullyMigrated ? fullyMigratedUuidsMap : internalCollectorsUuidsMap;
        const otherMap = !isFullyMigrated ? fullyMigratedUuidsMap : internalCollectorsUuidsMap;

        const uuidBuckets = get(indexBucket, `${uuidBucketName}.buckets`, []);
        for (const { key, by_timestamp: byTimestamp } of uuidBuckets) {
          if (!map[key]) {
            if (otherMap[key]) {
              partiallyMigratedUuidsMap[key] = true;
              delete otherMap[key];
            }
            else {
              map[key] = true;
            }
          }
          if (!isFullyMigrated) {
            internalTimestamps.push(byTimestamp.value);
          }
        }
      }

      capabilities.totalUniqueInstanceCount = uniq([
        ...Object.keys(internalCollectorsUuidsMap),
        ...Object.keys(fullyMigratedUuidsMap),
        ...Object.keys(partiallyMigratedUuidsMap)
      ]).length;
      capabilities.totalUniqueFullyMigratedCount = Object.keys(fullyMigratedUuidsMap).length;
      capabilities.byUuid = {
        ...Object.keys(internalCollectorsUuidsMap).reduce((accum, uuid) => ({
          ...accum,
          [uuid]: { isInternalCollector: true }
        }), {}),
        ...Object.keys(partiallyMigratedUuidsMap).reduce((accum, uuid) => ({
          ...accum,
          [uuid]: { isPartiallyMigrated: true, lastInternallyCollectedTimestamp: internalTimestamps[0] }
        }), {}),
        ...Object.keys(fullyMigratedUuidsMap).reduce((accum, uuid) => ({
          ...accum,
          [uuid]: { isFullyMigrated: true }
        }), {}),
      };
    }

    return {
      ...products,
      [product.name]: capabilities,
    };
  }, {});

  return status;
};
