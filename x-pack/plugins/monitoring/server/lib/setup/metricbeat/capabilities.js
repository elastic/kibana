/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, sortByOrder, uniq, isEqual } from 'lodash';
import { METRICBEAT_INDEX_NAME_UNIQUE_TOKEN } from '../../../../common/constants';

export const getRecentMonitoringDocuments = async (req, indexPatterns, clusterUuid) => {
  const filters = [
    {
      range: {
        'timestamp': {
          gte: 'now-2m',
          lte: 'now'
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
            es_cluster_uuids: {
              terms: {
                field: 'cluster_uuid'
              }
            },
            kibana_uuids: {
              terms: {
                field: 'kibana_stats.kibana.uuid'
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
      return 'es_cluster_uuids';
    case 'kibana':
      return 'kibana_uuids';
  }
}

export const getSetupCapabilities = async (req, indexPatterns, clusterUuid) => {
  const PRODUCTS = [
    { name: 'kibana' },
    { name: 'beats' },
    { name: 'logstash' },
    { name: 'apm', token: '-beats-' },
    { name: 'elasticsearch', token: '-es-' },
  ];

  const recentDocuments = await getRecentMonitoringDocuments(req, indexPatterns, clusterUuid);
  const indicesBuckets = get(recentDocuments, 'aggregations.indices.buckets');

  const products = PRODUCTS.map(product => {
    const token = product.token || product.name;
    const indexBuckets = indicesBuckets.filter(bucket => bucket.key.includes(token));
    const uuidBucketName = getUuidBucketName(product.name);

    const capabilities = {
      totalUniqueInstanceCount: 0,
      isInternalCollector: false,
      isNetNewUser: false,
      isPartiallyMigrated: false,
      isFullyMigrated: false,
      internalCollectorsUuids: [],
      fullyMigratedUuids: [],
      partiallyMigratedUuids: [],
      fullyMigratedButNeedsToDisableLegacy: false
    };

    const fullyMigratedUuidsMap = {};
    const internalCollectorsUuidsMap = {};
    const partiallyMigratedUuidsMap = {};

    // If there is no data, then they are a net new user
    if (!indexBuckets || indexBuckets.length === 0) {
      capabilities.totalUniqueInstanceCount = 0;
      capabilities.isNetNewUser = true;
    }
    // If there is a single bucket, then they are fully migrated or fully on the internal collector
    else if (indexBuckets.length === 1) {
      const singleIndexBucket = indexBuckets[0];
      const isFullyMigrated = singleIndexBucket.key.includes(METRICBEAT_INDEX_NAME_UNIQUE_TOKEN);

      const map = isFullyMigrated ? fullyMigratedUuidsMap : internalCollectorsUuidsMap;
      const uuidBuckets = get(singleIndexBucket, `${uuidBucketName}.buckets`, []);
      for (const { key } of uuidBuckets) {
        if (!map[key]) {
          map[key] = true;
        }
      }
      capabilities.isFullyMigrated = isFullyMigrated;
      capabilities.isInternalCollector = !isFullyMigrated;
      capabilities.totalUniqueInstanceCount = Object.keys(map).length;
      capabilities.fullyMigratedUuids = Object.keys(fullyMigratedUuidsMap);
      capabilities.internalCollectorsUuids = Object.keys(internalCollectorsUuidsMap);
    }
    // If there are multiple buckets, they are partially upgraded assuming a single mb index exists
    else {
      for (const indexBucket of indexBuckets) {
        const isFullyMigrated = indexBucket.key.includes(METRICBEAT_INDEX_NAME_UNIQUE_TOKEN);
        const map = isFullyMigrated ? fullyMigratedUuidsMap : internalCollectorsUuidsMap;
        const otherMap = !isFullyMigrated ? fullyMigratedUuidsMap : internalCollectorsUuidsMap;
        const uuidBuckets = get(indexBucket, `${uuidBucketName}.buckets`, []);
        for (const { key } of uuidBuckets) {
          if (!map[key]) {
            if (otherMap[key]) {
              delete otherMap[key];
              partiallyMigratedUuidsMap[key] = true;
            }
            else {
              map[key] = true;
            }
          }
        }
      }

      capabilities.isFullyMigrated = Object.keys(internalCollectorsUuidsMap).length === 0;
      capabilities.isPartiallyMigrated = Object.keys(partiallyMigratedUuidsMap).length > 0;
      capabilities.isInternalCollector = Object.keys(fullyMigratedUuidsMap).length === 0
        && Object.keys(partiallyMigratedUuidsMap).length === 0;
      capabilities.totalUniqueInstanceCount = uniq([
        ...Object.keys(internalCollectorsUuidsMap),
        ...Object.keys(fullyMigratedUuidsMap)
      ]).length;
      capabilities.fullyMigratedUuids = Object.keys(fullyMigratedUuidsMap);
      capabilities.partiallyMigratedUuids = Object.keys(partiallyMigratedUuidsMap);
      capabilities.internalCollectorsUuids = Object.keys(internalCollectorsUuidsMap);
      capabilities.fullyMigratedButNeedsToDisableLegacy = isEqual(capabilities.fullyMigratedUuids, capabilities.internalCollectorsUuids);
    }

    return {
      name: product.name,
      ...capabilities
    };
  }, {});

  return sortByOrder(products, ['isInternalCollector', 'isPartiallyMigrated', 'isFullyMigrated', 'isNetNewUser'], 'desc');
};
