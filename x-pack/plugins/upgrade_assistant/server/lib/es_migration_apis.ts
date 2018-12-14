/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { i18n } from '@kbn/i18n';
import {
  CallClusterWithRequest,
  DeprecationAPIResponse,
  DeprecationInfo,
  Request,
} from 'src/core_plugins/elasticsearch';

import { CURRENT_MAJOR_VERSION } from '../../common/version';

export interface EnrichedDeprecationInfo extends DeprecationInfo {
  index?: string;
  node?: string;
  actions?: Array<{
    label: string;
    url: string;
  }>;
}

export interface UpgradeAssistantStatus {
  cluster: EnrichedDeprecationInfo[];
  nodes: EnrichedDeprecationInfo[];
  indices: EnrichedDeprecationInfo[];

  [checkupType: string]: EnrichedDeprecationInfo[];
}

export async function getUpgradeAssistantStatus(
  callWithRequest: CallClusterWithRequest,
  req: Request,
  basePath: string
): Promise<UpgradeAssistantStatus> {
  const deprecations = await callWithRequest(req, 'transport.request', {
    path: '/_xpack/migration/deprecations',
    method: 'GET',
  });

  return {
    cluster: deprecations.cluster_settings,
    nodes: deprecations.node_settings,
    indices: getCombinedIndexInfos(deprecations, basePath),
  };
}

// Combines the information from the migration assistance api and the deprecation api into a single array.
// Enhances with information about which index the deprecation applies to and adds buttons for accessing the
// reindex UI.
const getCombinedIndexInfos = (deprecations: DeprecationAPIResponse, basePath: string) => {
  const combinedIndexInfo: EnrichedDeprecationInfo[] = [];

  Object.keys(deprecations.index_settings).forEach(indexName => {
    deprecations.index_settings[indexName]
      .map(d => ({ ...d, index: indexName } as EnrichedDeprecationInfo))
      .map(d => {
        // Add reindexing action if it's the old index deprecation warning.
        if (d.message === `Index created before ${CURRENT_MAJOR_VERSION}.0`) {
          d.actions = [
            {
              label: i18n.translate(
                'xpack.upgradeAssistant.checkupTab.indices.reindexInConsoleButtonLabel',
                {
                  defaultMessage: 'Reindex in Console',
                  description:
                    '"Console" should be the same name used to label the app under Dev Tools -> Console',
                }
              ),
              url: consoleTemplateUrl(basePath, indexName),
            },
          ];
        }

        return d;
      })
      .forEach(d => combinedIndexInfo.push(d));
  });

  return combinedIndexInfo;
};

// Returns a URL to open Console up with the reindex commands for the given index.
const consoleTemplateUrl = (basePath: string, indexName: string) => {
  const reindexTemplateUrl = `${basePath}/api/upgrade_assistant/reindex/console_template/${encodeURIComponent(
    indexName
  )}.json`;

  return `${basePath}/app/kibana#/dev_tools/console?load_from=${encodeURIComponent(
    reindexTemplateUrl
  )}`;
};
