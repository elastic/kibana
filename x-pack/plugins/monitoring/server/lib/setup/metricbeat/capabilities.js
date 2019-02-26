/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, sortByOrder } from 'lodash';
import { METRICBEAT_INDEX_NAME_UNIQUE_TOKEN } from '../../../../common/constants';

export const getRecentMonitoringDocuments = async (req, indexPatterns, clusterUuid) => {
  const filters = [
    {
      range: {
        'timestamp': {
          gte: 'now-5m',
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
            uuids: {
              terms: {
                field: 'cluster_uuid'
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

export const getSetupCapabilities = async (req, indexPatterns, clusterUuid) => {
  const capabilitiesModel = {
    totalInstanceCount: 0,
    isInternalCollector: false,
    isNetNewUser: false,
    isPartiallyUpgraded: false,
    isFullyMigrated: false,
    internalCollectorsUuids: [],
    fullyMigratedUuids: [],
  };

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
    const buckets = indicesBuckets.filter(bucket => bucket.key.includes(token));
    const capabilities = { ...capabilitiesModel };

    // If there is no data, then they are a net new user
    if (!buckets || buckets.length === 0) {
      capabilities.totalInstanceCount = 0;
      capabilities.isNetNewUser = true;
    }
    // If there is a single bucket, then they are fully migrated or fully on the internal collector
    else if (buckets.length === 1) {
      capabilities.totalInstanceCount = 1;
      const uuidBuckets = get(buckets[0], 'uuids.buckets', []);
      if (buckets[0].key.includes(METRICBEAT_INDEX_NAME_UNIQUE_TOKEN)) {
        capabilities.isFullyMigrated = true;
        capabilities.fullyMigratedUuids = uuidBuckets.map(bucket => bucket.key);
      } else {
        capabilities.isInternalCollector = true;
        capabilities.internalCollectorsUuids = uuidBuckets.map(bucket => bucket.key);
      }
    }
    // If there are multiple buckets, they are partially upgraded assuming a single mb index exists
    else {
      capabilities.totalInstanceCount = buckets.length;
      for (const bucket of buckets) {
        const uuidBuckets = get(bucket, 'uuids.buckets', []);
        if (bucket.key.includes(METRICBEAT_INDEX_NAME_UNIQUE_TOKEN)) {
          capabilities.fullyMigratedUuids.push(...uuidBuckets.map(bucket => bucket.key));
          capabilities.isPartiallyUpgraded = true;
        } else {
          capabilities.internalCollectorsUuids.push(...uuidBuckets.map(bucket => bucket.key));
        }
      }
      if (!capabilities.isPartiallyUpgraded) {
        // TODO: is this right? should this even happen?
        capabilities.isInternalCollector = true;
      }
    }

    return {
      name: product.name,
      ...capabilities
    };
  }, {});

  return sortByOrder(products, ['isInternalCollector', 'isPartiallyUpgraded', 'isFullyMigrated', 'isNetNewUser'], 'desc');
};
