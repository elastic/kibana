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
  readyForUpgrade: boolean;
  cluster: EnrichedDeprecationInfo[];
  indices: EnrichedDeprecationInfo[];
}

export async function getUpgradeAssistantStatus(
  callWithRequest: CallClusterWithRequest,
  req: Request,
  basePath: string,
  apmIndices: string[]
): Promise<UpgradeAssistantStatus> {
  const [deprecations, apmIndexDeprecations] = await Promise.all([
    (await callWithRequest(req, 'transport.request', {
      path: '/_migration/deprecations',
      method: 'GET',
    })) as DeprecationAPIResponse,
    getDeprecatedApmIndices(callWithRequest, req, apmIndices),
  ]);

  const cluster = deprecations.cluster_settings
    .concat(deprecations.ml_settings)
    .concat(deprecations.node_settings);
  const indices = getCombinedIndexInfos(
    deprecations.index_settings,
    basePath,
    apmIndexDeprecations
  );

  const criticalWarnings = cluster.concat(indices).filter(d => d.level === 'critical');

  return {
    readyForUpgrade: criticalWarnings.length === 0,
    cluster,
    indices,
  };
}

// Reformats the index deprecations to an array of deprecation warnings extended with an index field.
const getCombinedIndexInfos = (
  indexSettings: IndexSettingsDeprecationInfo,
  basePath: string,
  apmIndexDeprecations: EnrichedDeprecationInfo[]
) => {
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
