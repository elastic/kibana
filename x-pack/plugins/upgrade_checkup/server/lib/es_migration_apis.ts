/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AssistanceAPIResponse,
  CallClusterWithRequest,
  DeprecationAPIResponse,
  DeprecationInfo,
  MIGRATION_ASSISTANCE_INDEX_ACTION,
  Request,
} from 'src/core_plugins/elasticsearch';

import fakeAssistance from './fake_assistance.json';
import fakeDeprecations from './fake_deprecations.json';

interface IndexInfoMap {
  [indexName: string]: {
    deprecations: DeprecationInfo[];
    actionRequired?: MIGRATION_ASSISTANCE_INDEX_ACTION;
  };
}

export interface UpgradeCheckupStatus {
  cluster: {
    deprecations: DeprecationAPIResponse['cluster_settings'];
  };
  nodes: {
    deprecations: DeprecationAPIResponse['node_settings'];
  };
  indices: IndexInfoMap;
}

export async function getUpgradeCheckupStatus(
  callWithRequest: CallClusterWithRequest,
  req: Request
): Promise<UpgradeCheckupStatus> {
  // let migrationAssistance = await callWithRequest(req, 'transport.request', {
  //   path: '/_xpack/migration/assistance',
  //   method: 'GET',
  // });

  // const deprecations = await callWithRequest(req, 'transport.request', {
  //   path: '/_xpack/migration/deprecations',
  //   method: 'GET',
  // });

  // Fake data for now. TODO: Uncomment above and remove fake data
  const migrationAssistance = _.cloneDeep(fakeAssistance) as AssistanceAPIResponse;
  const deprecations = _.cloneDeep(fakeDeprecations) as DeprecationAPIResponse;

  const indexNames = new Set(
    Object.keys(deprecations.index_settings).concat(Object.keys(migrationAssistance.indices))
  );

  const combinedIndexInfo: IndexInfoMap = {};
  for (const indexName of indexNames) {
    const actionRequired = migrationAssistance.indices[indexName]
      ? migrationAssistance.indices[indexName].action_required
      : undefined;

    const indexDeprecations = deprecations.index_settings[indexName] || [];

    // Add action required to index deprecations.
    if (actionRequired === 'reindex') {
      indexDeprecations.push({
        level: 'critical',
        message: 'This index must be reindexed in order to upgrade the Elastic Stack.',
        details: 'Reindexing is irreversible, so always back up your index before proceeding.',
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-snapshots.html',
      });
    } else if (actionRequired === 'upgrade') {
      indexDeprecations.push({
        level: 'critical',
        message: 'This index must be upgraded in order to upgrade the Elastic Stack.',
        details: 'Upgrading is irreversible, so always back up your index before proceeding.',
        // TODO: not sure what URL to put here?
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-snapshots.html',
      });
    }

    combinedIndexInfo[indexName] = {
      deprecations: indexDeprecations,
      actionRequired,
    };
  }

  return {
    cluster: {
      deprecations: deprecations.cluster_settings,
    },
    nodes: {
      deprecations: deprecations.node_settings,
    },
    indices: combinedIndexInfo,
  };
}
