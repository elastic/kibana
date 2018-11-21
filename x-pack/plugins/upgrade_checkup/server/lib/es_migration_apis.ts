/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import {
  AssistanceAPIResponse,
  CallClusterWithRequest,
  DeprecationAPIResponse,
  DeprecationInfo,
  Request,
} from 'src/core_plugins/elasticsearch';

import fakeAssistance from './fake_assistance.json';
import fakeDeprecations from './fake_deprecations.json';

export interface EnrichedDeprecationInfo extends DeprecationInfo {
  index?: string;
  node?: string;
  uiButtons: Array<{
    label: string;
    url: string;
  }>;
}

export interface UpgradeCheckupStatus {
  cluster: EnrichedDeprecationInfo[];
  nodes: EnrichedDeprecationInfo[];
  indices: EnrichedDeprecationInfo[];
}

export async function getUpgradeCheckupStatus(
  callWithRequest: CallClusterWithRequest,
  req: Request,
  basePath: string
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

  const combinedIndexInfo: EnrichedDeprecationInfo[] = [];
  Object.keys(deprecations.index_settings).forEach(indexName => {
    deprecations.index_settings[indexName]
      .map(d => ({ ...d, index: indexName }))
      .map(addUiButtonForDocs)
      .forEach(d => combinedIndexInfo.push(d));
  });

  for (const indexName of Object.keys(migrationAssistance.indices)) {
    const actionRequired = migrationAssistance.indices[indexName].action_required;

    // Add action required to index deprecations.
    if (actionRequired === 'reindex') {
      combinedIndexInfo.push({
        index: indexName,
        level: 'critical',
        message: 'This index must be reindexed in order to upgrade the Elastic Stack.',
        details: 'Reindexing is irreversible, so always back up your index before proceeding.',
        uiButtons: [
          {
            label: 'Reindex in Console',
            url: consoleTemplateUrl(basePath, indexName),
          },
          {
            label: 'Read Documentation',
            url:
              'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-snapshots.html',
          },
        ],
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-snapshots.html',
      });
    } else if (actionRequired === 'upgrade') {
      combinedIndexInfo.push({
        index: indexName,
        level: 'critical',
        message: 'This index must be upgraded in order to upgrade the Elastic Stack.',
        details: 'Upgrading is irreversible, so always back up your index before proceeding.',
        // TODO: not sure what URL to put here?
        uiButtons: [
          {
            label: 'Read Documentation',
            url:
              'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-snapshots.html',
          },
        ],
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-snapshots.html',
      });
    }
  }

  return {
    cluster: deprecations.cluster_settings.map(addUiButtonForDocs),
    nodes: deprecations.node_settings.map(addUiButtonForDocs),
    indices: combinedIndexInfo,
  };
}

const consoleTemplateUrl = (basePath: string, indexName: string) => {
  const reindexTemplateUrl = `${basePath}/api/upgrade_checkup/reindex/command_template/${encodeURIComponent(
    indexName
  )}.json`;

  return `${basePath}/app/kibana#/dev_tools/console?load_from=${encodeURIComponent(
    reindexTemplateUrl
  )}`;
};

const addUiButtonForDocs = (dep: DeprecationInfo): EnrichedDeprecationInfo => {
  return {
    uiButtons: [
      {
        label: 'Read Documentation',
        url: dep.url,
      },
    ],
    ...dep,
  };
};
