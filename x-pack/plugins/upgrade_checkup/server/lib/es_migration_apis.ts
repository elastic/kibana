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

export interface EnrichedDeprecationInfo extends DeprecationInfo {
  index?: string;
  node?: string;
}

export interface UpgradeCheckupStatus {
  cluster: {
    deprecations: DeprecationAPIResponse['cluster_settings'];
  };
  nodes: {
    deprecations: DeprecationAPIResponse['node_settings'];
  };
  indices: IndexInfoMap;
  new_data: {
    cluster: EnrichedDeprecationInfo[];
    nodes: EnrichedDeprecationInfo[];
    indices: EnrichedDeprecationInfo[];
  };
}

export async function getUpgradeCheckupStatus(
  callWithRequest: CallClusterWithRequest,
  req: Request
): Promise<UpgradeCheckupStatus> {
  // const migrationAssistanceReq = callWithRequest(req, 'transport.request', {
  //   path: '/_xpack/migration/assistance',
  //   method: 'GET',
  // });

  // const deprecationsReq = callWithRequest(req, 'transport.request', {
  //   path: '/_xpack/migration/deprecations',
  //   method: 'GET',
  // });

  // const [migrationAssistance, deprecations] = await Promise.all([
  //   migrationAssistanceReq,
  //   deprecationsReq,
  // ]);

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

  const combinedIndexInfo2: EnrichedDeprecationInfo[] = [];
  // for (const indexName in migrationAssistance.indices) {
  //   for (const dep of )
  // }
  Object.keys(deprecations.index_settings).forEach(indexName => {
    deprecations.index_settings[indexName]
      .map(d => ({ ...d, index: indexName }))
      .forEach(d => combinedIndexInfo2.push(d));
  });

  // Object.keys(migrationAssistance.indices).forEach(indexName => {
  //   const actionRequired = migrationAssistance.indices[indexName].action_required;

  //   if (actionRequired === 'reindex') {
  //     combinedIndexInfo2.push({
  //       index: indexName,
  //       level: 'critical',
  //       message: 'This index must be reindexed in order to upgrade the Elastic Stack.',
  //       details: 'Reindexing is irreversible, so always back up your index before proceeding.',
  //       url:
  //         'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-snapshots.html',
  //     });
  //   } else if (actionRequired === 'upgrade') {
  //     combinedIndexInfo2.push({
  //       index: indexName,
  //       level: 'critical',
  //       message: 'This index must be upgraded in order to upgrade the Elastic Stack.',
  //       details: 'Upgrading is irreversible, so always back up your index before proceeding.',
  //       // TODO: not sure what URL to put here?
  //       url:
  //         'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-snapshots.html',
  //     });
  //   }
  // });

  return {
    cluster: {
      deprecations: deprecations.cluster_settings,
    },
    nodes: {
      deprecations: deprecations.node_settings,
    },
    indices: combinedIndexInfo,
    new_data: {
      cluster: deprecations.cluster_settings,
      nodes: deprecations.node_settings,
      indices: combinedIndexInfo2,
    },
  };
}
