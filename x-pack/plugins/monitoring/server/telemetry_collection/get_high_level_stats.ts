/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ElasticsearchClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { createQuery } from './create_query';
import {
  INDEX_PATTERN_KIBANA,
  INDEX_PATTERN_BEATS,
  INDEX_PATTERN_LOGSTASH,
  KIBANA_SYSTEM_ID,
  BEATS_SYSTEM_ID,
  APM_SYSTEM_ID,
  LOGSTASH_SYSTEM_ID,
  TELEMETRY_QUERY_SOURCE,
} from '../../common/constants';

export interface ClusterCloudStats {
  name: string;
  count: number;
  vms: number;
  regions: Array<{ region: string; count: number }>;
  vm_types: Array<{ vm_type: string; count: number }>;
  zones: Array<{ zone: string; count: number }>;
}

export interface ClusterHighLevelStats {
  count: number;
  versions: Array<{ version: string; count: number }>;
  os: {
    platforms: Array<{ platform: string; count: number }>;
    platformReleases: Array<{ platformRelease: string; count: number }>;
    distros: Array<{ distro: string; count: number }>;
    distroReleases: Array<{ distroRelease: string; count: number }>;
  };
  cloud: ClusterCloudStats[] | undefined;
}

export interface ClustersHighLevelStats {
  [clusterUuid: string]: ClusterHighLevelStats;
}

type Counter = Map<string, number>;

/**
 * Update a counter associated with the {@code key}.
 *
 * @param {Map} map Map to update the counter for the {@code key}.
 * @param {String} key The key to increment a counter for.
 */
export function incrementByKey(map: Counter, key?: string) {
  if (!key) {
    return;
  }

  let count = map.get(key);

  if (!count) {
    count = 0;
  }

  map.set(key, count + 1);
}

interface InternalCloudMap {
  count: number;
  unique: Set<string>;
  vm_type: Counter;
  region: Counter;
  zone: Counter;
}

interface CloudEntry {
  id: string;
  name: string;
  vm_type: string;
  region: string;
  zone: string;
}

/**
 * Help to reduce Cloud metrics into unidentifiable metrics (e.g., count IDs so that they can be dropped).
 *
 * @param  {Map} clouds Existing cloud data by cloud name.
 * @param  {Object} cloud Cloud object loaded from Elasticsearch data.
 */
function reduceCloudForCluster(cloudMap: Map<string, InternalCloudMap>, cloud?: CloudEntry) {
  if (!cloud) {
    return;
  }

  let cloudByName = cloudMap.get(cloud.name);

  if (!cloudByName) {
    cloudByName = {
      count: 0,
      unique: new Set(),
      vm_type: new Map(),
      region: new Map(),
      zone: new Map(),
    };

    cloudMap.set(cloud.name, cloudByName);
  }

  // keep track of how many running instances there are
  cloudByName.count++;

  if (cloud.id) {
    cloudByName.unique.add(cloud.id);
  }

  incrementByKey(cloudByName.vm_type, cloud.vm_type);
  incrementByKey(cloudByName.region, cloud.region);
  incrementByKey(cloudByName.zone, cloud.zone);
}

interface InternalClusterMap {
  count: number;
  versions: Counter;
  cloudMap: Map<string, InternalCloudMap>;
  os: {
    platforms: Counter;
    platformReleases: Counter;
    distros: Counter;
    distroReleases: Counter;
  };
}

interface OSData {
  platform?: string;
  platformRelease?: string;
  distro?: string;
  distroRelease?: string;
}

/**
 * Group the instances (hits) by clusters.
 *
 * @param  {Array} instances Array of hits from the request containing the cluster UUID and version.
 * @param {String} product The product to limit too ('kibana', 'logstash', 'beats')
 *
 * Returns a map of the Cluster UUID to an {@link Object} containing the {@code count} and {@code versions} {@link Map}
 */
function groupInstancesByCluster<T extends { cluster_uuid?: string }>(
  instances: Array<{ _source?: T }>,
  product: string
) {
  const clusterMap = new Map<string, InternalClusterMap>();

  // hits are sorted arbitrarily by product UUID
  instances.map((instance) => {
    const clusterUuid = instance._source!.cluster_uuid;
    const version: string | undefined = get(
      instance,
      `_source.${product}_stats.${product}.version`
    );
    const cloud: CloudEntry | undefined = get(instance, `_source.${product}_stats.cloud`);
    const os: OSData | undefined = get(instance, `_source.${product}_stats.os`);

    if (clusterUuid) {
      let cluster = clusterMap.get(clusterUuid);

      if (!cluster) {
        cluster = {
          count: 0,
          versions: new Map(),
          cloudMap: new Map(),
          os: {
            platforms: new Map(),
            platformReleases: new Map(),
            distros: new Map(),
            distroReleases: new Map(),
          },
        };
        clusterMap.set(clusterUuid, cluster);
      }

      // keep track of how many instances there are
      cluster.count++;

      incrementByKey(cluster.versions, version);
      reduceCloudForCluster(cluster.cloudMap, cloud);

      if (os) {
        incrementByKey(cluster.os.platforms, os.platform);
        incrementByKey(cluster.os.platformReleases, os.platformRelease);
        incrementByKey(cluster.os.distros, os.distro);
        incrementByKey(cluster.os.distroReleases, os.distroRelease);
      }
    }
  });

  return clusterMap;
}

/**
 * Convert the {@code map} to an {@code Object} using the {@code keyName} as the key in the object. Per map entry:
 *
 * [
 *   { [keyName]: key1, count: value1 },
 *   { [keyName]: key2, count: value2 }
 * ]
 */
export function mapToList<T>(map: Map<string, number>, keyName: string): T[] {
  const list: T[] = [];

  for (const [key, count] of map) {
    list.push({ [keyName]: key, count } as unknown as T);
  }

  return list;
}

/**
 * Returns the right index pattern to find monitoring documents based on the product id
 *
 * @param {*} product The product id, which should be in the constants file
 */
function getIndexPatternForStackProduct(product: string) {
  switch (product) {
    case KIBANA_SYSTEM_ID:
      return INDEX_PATTERN_KIBANA;
    case BEATS_SYSTEM_ID:
    case APM_SYSTEM_ID:
      return INDEX_PATTERN_BEATS;
    case LOGSTASH_SYSTEM_ID:
      return INDEX_PATTERN_LOGSTASH;
  }
  return null;
}

/**
 * Get statistics about selected Elasticsearch clusters, for the selected {@code product}.
 *
 * @param {Object} server The server instance
 * @param {function} callCluster The callWithRequest or callWithInternalUser handler
 * @param {Array} clusterUuids The string Cluster UUIDs to fetch details for
 * @param {Date} start Start time to limit the stats
 * @param {Date} end End time to limit the stats
 * @param {String} product The product to limit too ('kibana', 'logstash', 'beats')
 *
 * Returns an object keyed by the cluster UUIDs to make grouping easier.
 */
export async function getHighLevelStats(
  callCluster: ElasticsearchClient,
  clusterUuids: string[],
  start: string,
  end: string,
  product: string,
  maxBucketSize: number
) {
  const response = await fetchHighLevelStats(
    callCluster,
    clusterUuids,
    start,
    end,
    product,
    maxBucketSize
  );
  return handleHighLevelStatsResponse(response, product);
}

export async function fetchHighLevelStats<
  T extends { cluster_uuid?: string } = { cluster_uuid?: string }
>(
  callCluster: ElasticsearchClient,
  clusterUuids: string[],
  start: string,
  end: string,
  product: string,
  maxBucketSize: number
): Promise<estypes.SearchResponse<T>> {
  const isKibanaIndex = product === KIBANA_SYSTEM_ID;
  const filters: object[] = [{ terms: { cluster_uuid: clusterUuids } }];

  // we should supply this from a parameter in the future so that this remains generic
  if (isKibanaIndex) {
    const kibanaFilter = {
      bool: {
        should: [
          { exists: { field: 'kibana_stats.usage.index' } },
          {
            bool: {
              should: [
                { range: { 'kibana_stats.kibana.version': { lt: '6.7.2' } } },
                { term: { 'kibana_stats.kibana.version': '7.0.0' } },
              ],
            },
          },
        ],
      },
    };

    filters.push(kibanaFilter);
  }

  const params: estypes.SearchRequest = {
    index: getIndexPatternForStackProduct(product) as string,
    size: maxBucketSize,
    ignore_unavailable: true,
    filter_path: [
      'hits.hits._source.cluster_uuid',
      `hits.hits._source.${product}_stats.${product}.version`,
      `hits.hits._source.${product}_stats.os`,
      `hits.hits._source.${product}_stats.usage`,
      // we don't want metadata
      `hits.hits._source.${product}_stats.cloud.name`,
      `hits.hits._source.${product}_stats.cloud.id`,
      `hits.hits._source.${product}_stats.cloud.vm_type`,
      `hits.hits._source.${product}_stats.cloud.region`,
      `hits.hits._source.${product}_stats.cloud.zone`,
    ],
    body: {
      query: createQuery({
        start,
        end,
        type: `${product}_stats`,
        filters,
      }) as estypes.QueryDslQueryContainer,
      collapse: {
        // a more ideal field would be the concatenation of the uuid + transport address for duped UUIDs (copied installations)
        field: `${product}_stats.${product}.uuid`,
      },
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
    },
  };

  const response = await callCluster.search<T>(params, {
    headers: {
      'X-QUERY-SOURCE': TELEMETRY_QUERY_SOURCE,
    },
  });
  return response;
}

/**
 * Determine common, high-level details about the current product (e.g., Kibana) from the {@code response}.
 *
 * @param {Object} response The response from the aggregation
 * @param {String} product The product to limit too ('kibana', 'logstash', 'beats')
 *
 * Returns an object keyed by the cluster UUIDs to make grouping easier.
 */
export function handleHighLevelStatsResponse(
  response: estypes.SearchResponse<{ cluster_uuid?: string }>,
  product: string
): ClustersHighLevelStats {
  const instances = response.hits?.hits || [];
  const clusterMap = groupInstancesByCluster(instances, product);

  const clusters: ClustersHighLevelStats = {};

  for (const [clusterUuid, cluster] of clusterMap) {
    // it's unlikely this will be an array of more than one, but it is one just incase
    const clouds = [];

    // remap the clouds (most likely singular or empty)
    for (const [name, cloud] of cluster.cloudMap) {
      const cloudStats: ClusterCloudStats = {
        name,
        count: cloud.count,
        vms: cloud.unique.size,
        regions: mapToList(cloud.region, 'region'),
        vm_types: mapToList(cloud.vm_type, 'vm_type'),
        zones: mapToList(cloud.zone, 'zone'),
      };
      clouds.push(cloudStats);
    }

    // map stats for product by cluster so that it can be joined with ES cluster stats
    clusters[clusterUuid] = {
      count: cluster.count,
      // remap the versions into something more digestable that won't blowup mappings:
      versions: mapToList(cluster.versions, 'version'),
      os: {
        platforms: mapToList(cluster.os.platforms, 'platform'),
        platformReleases: mapToList(cluster.os.platformReleases, 'platformRelease'),
        distros: mapToList(cluster.os.distros, 'distro'),
        distroReleases: mapToList(cluster.os.distroReleases, 'distroRelease'),
      },
      cloud: clouds.length > 0 ? clouds : undefined,
    };
  }

  return clusters;
}
