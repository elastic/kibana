/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { Request } from '@commercial/hapi';
import {
  CallClusterWithRequest,
  DeprecationAPIResponse,
  DeprecationInfo,
} from 'src/legacy/core_plugins/elasticsearch';

const CLOUD_FILTERS = [
  'Security realm settings structure changed',
  'TLS v1.0 has been removed from default TLS/SSL protocols',
  'GCS Repository settings changed',
];

export interface EnrichedDeprecationInfo extends DeprecationInfo {
  index?: string;
  node?: string;
}

export interface UpgradeAssistantStatus {
  readyForUpgrade: boolean;
  cluster: EnrichedDeprecationInfo[];
  indices: EnrichedDeprecationInfo[];
}

export async function getUpgradeAssistantStatus(
  callWithRequest: CallClusterWithRequest,
  req: Request,
  isCloudEnabled: boolean
): Promise<UpgradeAssistantStatus> {
  const deprecations = await callWithRequest(req, 'transport.request', {
    path: '/_xpack/migration/deprecations',
    method: 'GET',
  });

  const cluster = getClusterDeprecations(deprecations, isCloudEnabled);
  const indices = getCombinedIndexInfos(deprecations);

  const criticalWarnings = cluster.concat(indices).filter(d => d.level === 'critical');

  return {
    readyForUpgrade: criticalWarnings.length === 0,
    cluster,
    indices,
  };
}

// Reformats the index deprecations to an array of deprecation warnings extended with an index field.
const getCombinedIndexInfos = (deprecations: DeprecationAPIResponse) =>
  Object.keys(deprecations.index_settings).reduce(
    (indexDeprecations, indexName) => {
      return indexDeprecations.concat(
        deprecations.index_settings[indexName].map(
          d => ({ ...d, index: indexName } as EnrichedDeprecationInfo)
        )
      );
    },
    [] as EnrichedDeprecationInfo[]
  );

const getClusterDeprecations = (deprecations: DeprecationAPIResponse, isCloudEnabled: boolean) => {
  const combined = deprecations.cluster_settings
    .concat(deprecations.ml_settings)
    .concat(deprecations.node_settings);

  if (isCloudEnabled) {
    // In Cloud, this is handled at upgrade time. Filter it out improve upgrade UX.
    return combined.filter(d => CLOUD_FILTERS.indexOf(d.message) === -1);
  } else {
    return combined;
  }
};
