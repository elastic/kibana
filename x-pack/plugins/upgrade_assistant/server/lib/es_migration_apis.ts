/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'src/core/server';
import { DeprecationAPIResponse } from 'src/legacy/core_plugins/elasticsearch';
import {
  ClusterStateAPIResponse,
  EnrichedDeprecationInfo,
  UpgradeAssistantStatus,
} from '../../common/types';
import { getIndexStateFromClusterState } from '../../common/get_index_state_from_cluster_state';

export async function getUpgradeAssistantStatus(
  dataClient: IScopedClusterClient,
  isCloudEnabled: boolean
): Promise<UpgradeAssistantStatus> {
  const deprecations = await dataClient.callAsCurrentUser('transport.request', {
    path: '/_migration/deprecations',
    method: 'GET',
  });

  const cluster = getClusterDeprecations(deprecations, isCloudEnabled);
  const indices = getCombinedIndexInfos(deprecations);

  const indexNames = indices.map(({ index }) => index!);

  // If we have found deprecation information for index/indices, add some additional information;
  // is it currently open or closed?
  if (indexNames.length) {
    // According to https://www.elastic.co/guide/en/elasticsearch/reference/7.6/cluster-state.html
    // The response from this call is considered internal and subject to change. We have an API
    // integration test for asserting that the current ES version still returns what we expect.
    // This lives in x-pack/test/upgrade_assistant_integration
    const clusterState: ClusterStateAPIResponse = await dataClient.callAsCurrentUser(
      'cluster.state',
      {
        index: indexNames,
        metric: 'metadata',
      }
    );

    indices.forEach(indexData => {
      indexData.blockerForReindexing =
        getIndexStateFromClusterState(indexData.index!, clusterState) === 'close'
          ? 'index-closed'
          : undefined;
    });
  }

  const criticalWarnings = cluster.concat(indices).filter(d => d.level === 'critical');

  return {
    readyForUpgrade: criticalWarnings.length === 0,
    cluster,
    indices,
  };
}

// Reformats the index deprecations to an array of deprecation warnings extended with an index field.
const getCombinedIndexInfos = (deprecations: DeprecationAPIResponse) =>
  Object.keys(deprecations.index_settings).reduce((indexDeprecations, indexName) => {
    return indexDeprecations.concat(
      deprecations.index_settings[indexName].map(
        d =>
          ({
            ...d,
            index: indexName,
            reindex: /Index created before/.test(d.message),
          } as EnrichedDeprecationInfo)
      )
    );
  }, [] as EnrichedDeprecationInfo[]);

const getClusterDeprecations = (deprecations: DeprecationAPIResponse, isCloudEnabled: boolean) => {
  const combined = deprecations.cluster_settings
    .concat(deprecations.ml_settings)
    .concat(deprecations.node_settings);

  if (isCloudEnabled) {
    // In Cloud, this is changed at upgrade time. Filter it out to improve upgrade UX.
    return combined.filter(d => d.message !== 'Security realm settings structure changed');
  } else {
    return combined;
  }
};
