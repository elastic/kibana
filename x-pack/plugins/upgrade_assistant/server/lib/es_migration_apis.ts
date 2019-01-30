/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { Request } from 'hapi';
import { DeprecationAPIResponse, DeprecationInfo } from 'src/legacy/core_plugins/elasticsearch';

export interface EnrichedDeprecationInfo extends DeprecationInfo {
  index?: string;
  node?: string;
}

export interface UpgradeAssistantStatus {
  cluster: EnrichedDeprecationInfo[];
  indices: EnrichedDeprecationInfo[];

  [checkupType: string]: EnrichedDeprecationInfo[];
}

export async function getUpgradeAssistantStatus(
  callWithRequest: any,
  req: Request,
  basePath: string
): Promise<UpgradeAssistantStatus> {
  const deprecations = (await callWithRequest(req, 'transport.request', {
    path: '/_migration/deprecations',
    method: 'GET',
  })) as DeprecationAPIResponse;

  return {
    cluster: deprecations.cluster_settings.concat(deprecations.node_settings),
    indices: getCombinedIndexInfos(deprecations, basePath),
  };
}

// Combines the information from the migration assistance api and the deprecation api into a single array.
// Enhances with information about which index the deprecation applies to and adds buttons for accessing the
// reindex UI.
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
