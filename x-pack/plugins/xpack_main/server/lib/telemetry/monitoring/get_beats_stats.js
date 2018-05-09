/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { createQuery } from './create_query';

const HITS_SIZE = 10000; // maximum hits to receive from ES with each search

/*
 * Create a set of result objects where each is the result of searching hits from Elasticsearch with a size of HITS_SIZE each time.
 * @param {Object} server - The server instance
 * @param {function} callCluster - The callWithRequest or callWithInternalUser handler
 * @param {Array} clusterUuids - The string Cluster UUIDs to fetch details for
 * @param {Date} start - Start time to limit the stats
 * @param {Date} end - End time to limit the stats
 * @param {Number} page - selection of hits to fetch from ES
 * @param {Object} clusters - Beats stats in an object keyed by the cluster UUIDs
 * @param {Object} clusterHostMaps - the object keyed by cluster UUIDs to count the unique hosts
 * @return {Promise}
 */
export async function fetchBeatsStats(
  server, callCluster, clusterUuids, start, end,
  { page = 0, clusters, clusterHostMaps } = {}
) {
  const config = server.config();

  const params = {
    index: config.get('xpack.monitoring.beats.index_pattern'),
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._source.cluster_uuid',
      'hits.hits._source.beats_stats.beat.version',
      'hits.hits._source.beats_stats.beat.type',
      'hits.hits._source.beats_stats.beat.host',
      'hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.published',
      'hits.hits._source.beats_stats.metrics.libbeat.output.type',
    ],
    body: {
      query: createQuery({
        start,
        end,
        type: 'beats_stats',
        filters: [
          { terms: { cluster_uuid: clusterUuids } },
          { bool: { must_not: { term: { 'beats_stats.beat.type': 'apm-server' } } } },
        ],
      }),
      collapse: { field: 'beats_stats.beat.uuid' },
      sort: [{ 'beats_stats.timestamp': 'desc' }],
      from: page * HITS_SIZE,
      size: HITS_SIZE,
    },
  };

  const results = await callCluster('search', params);
  const hitsLength = get(results, 'hits.hits.length', 0);
  if (hitsLength > 0) {
    // further augment the clusters object with more stats
    processResults(results, clusters, clusterHostMaps);

    if (hitsLength === HITS_SIZE) {
      // call recursively
      const nextOptions = {
        clusters,
        clusterHostMaps,
        page: page + 1,
      };

      // returns a promise and keeps the caller blocked from returning until the entire clusters object is built
      return fetchBeatsStats(server, callCluster, clusterUuids, start, end, nextOptions);
    }
  }

  return Promise.resolve();
}

const getBaseStats = () => ({
  count: 0,
  versions: {},
  types: {},
  outputs: {},
  eventsPublished: 0,
  hosts: 0,
});

/*
 * Update a clusters object with processed beat stats
 * @param {Array} results - array of Beats docs from ES
 * @param {Object} clusters - Beats stats in an object keyed by the cluster UUIDs
 * @param {Object} clusterHostMaps - the object keyed by cluster UUIDs to count the unique hosts
 */
export function processResults(results = [], clusters, clusterHostMaps) {
  const currHits = get(results, 'hits.hits', []);
  currHits.forEach(hit => {
    const clusterUuid = get(hit, '_source.cluster_uuid');
    if (clusters[clusterUuid] === undefined) {
      clusters[clusterUuid] = getBaseStats();
      clusterHostMaps[clusterUuid] = new Map();
    }

    clusters[clusterUuid].count += 1;

    const { versions, types, outputs } = clusters[clusterUuid];

    const thisVersion = get(hit, '_source.beats_stats.beat.version');
    if (thisVersion !== undefined) {
      const thisVersionAccum = versions[thisVersion] || 0;
      versions[thisVersion] = thisVersionAccum + 1;
    }

    const thisType = get(hit, '_source.beats_stats.beat.type');
    if (thisType !== undefined) {
      const thisTypeAccum = types[thisType] || 0;
      types[thisType] = thisTypeAccum + 1;
    }

    const thisOutput = get(hit, '_source.beats_stats.metrics.libbeat.output.type');
    if (thisOutput !== undefined) {
      const thisOutputAccum = outputs[thisOutput] || 0;
      outputs[thisOutput] = thisOutputAccum + 1;
    }

    const thisEvents = get(hit, '_source.beats_stats.metrics.libbeat.pipeline.events.published');
    if (thisEvents !== undefined) {
      clusters[clusterUuid].eventsPublished += thisEvents;
    }

    const thisHost = get(hit, '_source.beats_stats.beat.host');
    if (thisHost !== undefined) {
      const hostsMap = clusterHostMaps[clusterUuid];
      hostsMap.set(thisHost, thisHost); // values don't matter, as this data structure is not part of the output
      clusters[clusterUuid].hosts = hostsMap.size;
    }
  });
}

/*
 * Call the function for fetching and summarizing beats stats
 * @return {Object} - Beats stats in an object keyed by the cluster UUIDs
 */
export async function getBeatsStats(server, callCluster, clusterUuids, start, end) {
  const clusters = {};
  const clusterHostMaps = {};
  await fetchBeatsStats(server, callCluster, clusterUuids, start, end, { clusters, clusterHostMaps });
  return clusters;
}
