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

import fakeAssistance from './__fixtures__/fake_assistance.json';
import fakeDeprecations from './__fixtures__/fake_deprecations.json';

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

  [checkupType: string]: EnrichedDeprecationInfo[];
}

export async function getUpgradeCheckupStatus(
  callWithRequest: CallClusterWithRequest,
  req: Request,
  basePath: string,
  useFakeData = false // TODO: remove
): Promise<UpgradeCheckupStatus> {
  let migrationAssistance: AssistanceAPIResponse;
  let deprecations: DeprecationAPIResponse;

  // Fake data for now. TODO: remove this before merging.
  if (useFakeData) {
    migrationAssistance = _.cloneDeep(fakeAssistance) as AssistanceAPIResponse;
    deprecations = _.cloneDeep(fakeDeprecations) as DeprecationAPIResponse;
  } else {
    const migrationAssistanceReq = callWithRequest(req, 'transport.request', {
      path: '/_xpack/migration/assistance',
      method: 'GET',
    });

    const deprecationsReq = callWithRequest(req, 'transport.request', {
      path: '/_xpack/migration/deprecations',
      method: 'GET',
    });

    [migrationAssistance, deprecations] = await Promise.all([
      migrationAssistanceReq,
      deprecationsReq,
    ]);
  }

  return {
    cluster: deprecations.cluster_settings.map(addUiButtonForDocs),
    nodes: deprecations.node_settings.map(addUiButtonForDocs),
    indices: getCombinedIndexInfos(migrationAssistance, deprecations, basePath).map(
      addUiButtonForDocs
    ),
  };
}

// Adds a uiButton item pointing the Elasticsearch docs for the given warning.
const addUiButtonForDocs = (
  dep: DeprecationInfo | EnrichedDeprecationInfo
): EnrichedDeprecationInfo => {
  const uiButtons = ((dep as any).uiButtons || []).concat([
    {
      label: 'Read Documentation',
      url: dep.url,
    },
  ]);

  return {
    ...dep,
    uiButtons,
  };
};

// Combines the information from the migration assistance api and the deprecation api into a single array.
// Enhances with information about which index the deprecation applies to and adds buttons for accessing the
// reindex UI.
const getCombinedIndexInfos = (
  migrationAssistance: AssistanceAPIResponse,
  deprecations: DeprecationAPIResponse,
  basePath: string
) => {
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
        ],
        url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/reindex-upgrade.html',
      });
    } else if (actionRequired === 'upgrade') {
      combinedIndexInfo.push({
        index: indexName,
        level: 'critical',
        message: 'This index must be upgraded in order to upgrade the Elastic Stack.',
        details: 'Upgrading is irreversible, so always back up your index before proceeding.',
        uiButtons: [],
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/current/migration-api-upgrade.html',
      });
    }
  }

  return combinedIndexInfo;
};

// Returns a URL to open Console up with the reindex commands for the given index.
const consoleTemplateUrl = (basePath: string, indexName: string) => {
  const reindexTemplateUrl = `${basePath}/api/upgrade_checkup/reindex/console_template/${encodeURIComponent(
    indexName
  )}.json`;

  return `${basePath}/app/kibana#/dev_tools/console?load_from=${encodeURIComponent(
    reindexTemplateUrl
  )}`;
};
