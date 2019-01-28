/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { Request } from 'hapi';
import {
  CallClusterWithRequest,
  DeprecationAPIResponse,
  DeprecationInfo,
  IndexSettingsDeprecationInfo,
} from 'src/legacy/core_plugins/elasticsearch';
import { getDeprecatedApmIndices } from './apm';

export interface EnrichedDeprecationInfo extends DeprecationInfo {
  index?: string;
  node?: string;
  reindex?: boolean;
}

export interface UpgradeAssistantStatus {
  cluster: EnrichedDeprecationInfo[];
  indices: EnrichedDeprecationInfo[];
}

export async function getUpgradeAssistantStatus(
  callWithRequest: CallClusterWithRequest,
  request: Request,
  basePath: string,
  apmIndices: string[]
): Promise<UpgradeAssistantStatus> {
  const [deprecations, apmIndexDeprecations] = await Promise.all([
    (await callWithRequest(request, 'transport.request', {
      path: '/_migration/deprecations',
      method: 'GET',
    })) as DeprecationAPIResponse,
    getDeprecatedApmIndices(callWithRequest, request, apmIndices),
  ]);

  return {
    cluster: deprecations.cluster_settings.concat(deprecations.node_settings),
    indices: getCombinedIndexInfos(deprecations.index_settings, basePath, apmIndexDeprecations),
  };
}

// Combines the information from the migration assistance API and the required APM indices for re-index
const getCombinedIndexInfos = (
  indexSettings: IndexSettingsDeprecationInfo,
  basePath: string,
  apmIndexDeprecations: EnrichedDeprecationInfo[]
): EnrichedDeprecationInfo[] => {
  const apmIndices = apmIndexDeprecations.reduce((acc, dep) => acc.add(dep.index), new Set());

  return Object.keys(indexSettings)
    .reduce(
      (indexDeprecations, indexName) => {
        // prevent APM indices from showing up for general re-indexing
        if (apmIndices.has(indexName)) {
          return indexDeprecations;
        }

        return indexDeprecations.concat(
          indexSettings[indexName].map(d => ({
            ...d,
            index: indexName,
            reindex: /Index created before/.test(d.message),
          }))
        );
      },
      [] as EnrichedDeprecationInfo[]
    )
    .concat(apmIndexDeprecations);
};
