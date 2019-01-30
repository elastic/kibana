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
} from 'src/legacy/core_plugins/elasticsearch';

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
  basePath: string
): Promise<UpgradeAssistantStatus> {
  const deprecations = await callWithRequest(req, 'transport.request', {
    path: '/_migration/deprecations',
    method: 'GET',
  });

  const cluster = deprecations.cluster_settings.concat(deprecations.node_settings);
  const indices = getCombinedIndexInfos(deprecations, basePath);

  const criticalWarnings = cluster.concat(indices).filter(d => d.level === 'critical');

  return {
    readyForUpgrade: criticalWarnings.length === 0,
    cluster,
    indices,
  };
}

// Reformats the index deprecations to an array of deprecation warnings extended with an index field.
const getCombinedIndexInfos = (deprecations: DeprecationAPIResponse, basePath: string) =>
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
