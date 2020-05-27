/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, find } from 'lodash';
import { checkParam } from '../error_missing_required';

/**
 * Augment the {@clusters} with their cluster state's from the {@code response}.
 *
 * @param  {Object} response The response containing each cluster's cluster state
 * @param  {Object} config Used to provide the node resolver
 * @param  {Array} clusters Array of clusters to be augmented
 * @return {Array} Always {@code clusters}.
 */
export function handleResponse(response, clusters) {
  const hits = get(response, 'hits.hits', []);

  hits.forEach((hit) => {
    const currentCluster = get(hit, '_source', {});

    if (currentCluster) {
      const cluster = find(clusters, { cluster_uuid: currentCluster.cluster_uuid });

      if (cluster) {
        cluster.cluster_state = currentCluster.cluster_state;
      }
    }
  });

  return clusters;
}

/**
 * This will attempt to augment the {@code clusters} with the {@code status}, {@code state_uuid}, and {@code nodes} from
 * their corresponding cluster state.
 *
 * If there is no cluster state available for any cluster, then it will be returned without any cluster state information.
 */
export function getClustersState(req, esIndexPattern, clusters) {
  checkParam(esIndexPattern, 'esIndexPattern in cluster/getClustersHealth');

  const clusterUuids = clusters
    .filter((cluster) => !cluster.cluster_state)
    .map((cluster) => cluster.cluster_uuid);

  // we only need to fetch the cluster state if we don't already have it
  //  newer documents (those from the version 6 schema and later already have the cluster state with cluster stats)
  if (clusterUuids.length === 0) {
    return Promise.resolve(clusters);
  }

  const params = {
    index: esIndexPattern,
    size: clusterUuids.length,
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._source.cluster_uuid',
      'hits.hits._source.cluster_state',
      'hits.hits._source.cluster_state',
    ],
    body: {
      query: {
        bool: {
          filter: [{ term: { type: 'cluster_state' } }, { terms: { cluster_uuid: clusterUuids } }],
        },
      },
      collapse: {
        field: 'cluster_uuid',
      },
      sort: { timestamp: { order: 'desc' } },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

  return callWithRequest(req, 'search', params).then((response) =>
    handleResponse(response, clusters)
  );
}
