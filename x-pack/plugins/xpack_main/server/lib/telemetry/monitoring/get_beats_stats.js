/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { createQuery } from './create_query';

const HITS_SIZE = 10000; // maximum hits to receive from ES with each search

const getBaseStats = () => ({
  // stats
  versions: {},
  types: {},
  outputs: {},
  count: 0,
  eventsPublished: 0,
  hosts: 0,
  // state
  module: {
    names: []
  },
});

/*
 * Create a set of result objects where each is the result of searching hits from Elasticsearch with a size of HITS_SIZE each time.
 * @param {Object} server - The server instance
 * @param {function} callCluster - The callWithRequest or callWithInternalUser handler
 * @param {Array} clusterUuids - The string Cluster UUIDs to fetch details for
 * @param {Date} start - Start time to limit the stats
 * @param {Date} end - End time to limit the stats
 * @param {Number} options.page - selection of hits to fetch from ES
 * @param {Object} options.clusters - Beats stats in an object keyed by the cluster UUIDs
 * @param {Object} options.clusterHostSets - the object keyed by cluster UUIDs to count the unique hosts
 * @param {Object} options.clusterModuleSets - the object keyed by cluster UUIDs to list the unique modules
 * @param {Object} options.collapse - field on which to collapse on in the query
 * @return {Promise}
 */
export async function fetchBeatsStats(server, callCluster, clusterUuids, start, end, { page = 0, ...options } = {}) {
  const config = server.config();

  const params = {
    index: config.get('xpack.monitoring.beats.index_pattern'),
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._source.cluster_uuid',
      'hits.hits._source.type',
      'hits.hits._source.beats_stats.beat.version',
      'hits.hits._source.beats_stats.beat.type',
      'hits.hits._source.beats_stats.beat.host',
      'hits.hits._source.beats_stats.stats.libbeat.pipeline.events.published',
      'hits.hits._source.beats_stats.stats.libbeat.output.type',
      'hits.hits._source.beats_state.state.module',
    ],
    body: {
      query: createQuery({
        start,
        end,
        filters: [
          { terms: { cluster_uuid: clusterUuids } },
          { bool: { must_not: { term: { 'beats_stats.beat.type': 'apm-server' } } } },
          { bool: {
            should: [
              { term: { 'type': 'beats_stats' } },
              { term: { 'type': 'beats_state' } }
            ]
          } }
        ],
      }),
      from: page * HITS_SIZE,
      collapse: { field: options.collapse },
      sort: [{ 'beats_stats.timestamp': 'desc' }],
      size: HITS_SIZE,
    },
  };

  const results = await callCluster('search', params);
  const hitsLength = get(results, 'hits.hits.length', 0);
  if (hitsLength > 0) {
    // further augment the clusters object with more stats
    processResults(results, options);

    if (hitsLength === HITS_SIZE) {
      // call recursively
      const nextOptions = {
        page: page + 1,
        ...options,
      };

      // returns a promise and keeps the caller blocked from returning until the entire clusters object is built
      return fetchBeatsStats(server, callCluster, clusterUuids, start, end, nextOptions);
    }
  }

  return Promise.resolve();
}

/*
 * Update a clusters object with processed beat stats
 * @param {Array} results - array of Beats docs from ES
 * @param {Object} clusters - Beats stats in an object keyed by the cluster UUIDs
 * @param {Object} clusterHostSets - the object keyed by cluster UUIDs to count the unique hosts
 * @param {Object} clusterModuleSets - the object keyed by cluster UUIDs to count the unique modules
 */
export function processResults(results = [], { clusters, clusterHostSets, clusterModuleSets }) {
  const currHits = get(results, 'hits.hits', []);
  currHits.forEach(hit => {
    const clusterUuid = get(hit, '_source.cluster_uuid');
    if (clusters[clusterUuid] === undefined) {
      clusters[clusterUuid] = getBaseStats();
      clusterHostSets[clusterUuid] = new Set();
      clusterModuleSets[clusterUuid] = new Set();
    }

    const { versions, types, outputs } = clusters[clusterUuid];

    if (get(hit, '_source.type') === 'beats_stats') {
      clusters[clusterUuid].count += 1;
    }

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

    const thisOutput = get(hit, '_source.beats_stats.stats.libbeat.output.type');
    if (thisOutput !== undefined) {
      const thisOutputAccum = outputs[thisOutput] || 0;
      outputs[thisOutput] = thisOutputAccum + 1;
    }

    const thisEvents = get(hit, '_source.beats_stats.stats.libbeat.pipeline.events.published');
    if (thisEvents !== undefined) {
      clusters[clusterUuid].eventsPublished += thisEvents;
    }

    const thisHost = get(hit, '_source.beats_stats.beat.host');
    if (thisHost !== undefined) {
      const hostsMap = clusterHostSets[clusterUuid];
      hostsMap.add(thisHost);
      clusters[clusterUuid].hosts = hostsMap.size;
    }

    const stateModule = get(hit, '_source.beats_state.state.module');
    if (stateModule !== undefined) {
      const moduleSet = clusterModuleSets[clusterUuid];
      stateModule.names.forEach(name => moduleSet.add(name));
      clusters[clusterUuid].module.names = Array.from(moduleSet);
    }
  });
}

/*
 * Call the function for fetching and summarizing beats stats
 * @return {Object} - Beats stats in an object keyed by the cluster UUIDs
 */
export async function getBeatsStats(server, callCluster, clusterUuids, start, end) {
  const options = {
    clusters: {},
    clusterHostSets: {},
    clusterModuleSets: {}
  };

  await Promise.all([
    fetchBeatsStats(server, callCluster, clusterUuids, start, end, { ...options, collapse: 'beats_stats.beat.uuid' }),
    fetchBeatsStats(server, callCluster, clusterUuids, start, end, { ...options, collapse: 'type' })
  ]);

  return options.clusters;
}
