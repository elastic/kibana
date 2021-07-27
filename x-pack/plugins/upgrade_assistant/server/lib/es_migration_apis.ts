/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MigrationDeprecationInfoDeprecation,
  MigrationDeprecationInfoResponse,
} from '@elastic/elasticsearch/api/types';
import { IScopedClusterClient } from 'src/core/server';
import { indexSettingDeprecations } from '../../common/constants';
import { EnrichedDeprecationInfo, UpgradeAssistantStatus } from '../../common/types';

import { esIndicesStateCheck } from './es_indices_state_check';

export async function getUpgradeAssistantStatus(
  dataClient: IScopedClusterClient
): Promise<UpgradeAssistantStatus> {
  // const { body: deprecations } = await dataClient.asCurrentUser.migration.deprecations();

  // TODO temp mock data
  const deprecations: MigrationDeprecationInfoResponse = {
    cluster_settings: [
      {
        level: 'warning',
        message: "A Cluster name cannot contain ':'",
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/7.0/breaking-changes-7.0.html#_literal_literal_is_no_longer_allowed_in_cluster_name',
        details:
          "This cluster is named [mycompany:logging], which contains the illegal character ':'.",
      },
    ],
    node_settings: [
      {
        level: 'critical',
        message: "B Cluster name cannot contain ':'",
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/7.0/breaking-changes-7.0.html#_literal_literal_is_no_longer_allowed_in_cluster_name',
        details:
          "This cluster is named [mycompany:logging], which contains the illegal character ':'.",
      },
    ],
    index_settings: {
      logs: [
        {
          level: 'warning',
          message: "C Index name cannot contain ':'",
          url:
            'https://www.elastic.co/guide/en/elasticsearch/reference/7.0/breaking-changes-7.0.html#_literal_literal_is_no_longer_allowed_in_index_name',
          details: "This index is named [logs:apache], which contains the illegal character ':'.",
        },
      ],
    },
    ml_settings: [
      {
        level: 'critical',
        message: "D Cluster name cannot contain ':'",
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/7.0/breaking-changes-7.0.html#_literal_literal_is_no_longer_allowed_in_cluster_name',
        details:
          "This cluster is named [mycompany:logging], which contains the illegal character ':'.",
      },
    ],
  };

  const getCombinedDeprecations = async () => {
    const indices = await getCombinedIndexInfos(deprecations, dataClient);

    return Object.keys(deprecations).reduce((combinedDeprecations, deprecationType) => {
      if (deprecationType === 'index_settings') {
        combinedDeprecations = [...combinedDeprecations, ...indices];
      } else {
        const deprecationsByType = deprecations[
          deprecationType as keyof MigrationDeprecationInfoResponse
        ] as MigrationDeprecationInfoDeprecation[];

        const enrichedDeprecationInfo = deprecationsByType.map(
          ({ details, level, message, url }) => {
            return {
              details,
              message,
              url,
              type: deprecationType as keyof MigrationDeprecationInfoResponse,
              isCritical: level === 'critical',
              correctiveAction: getCorrectiveAction(message),
            };
          }
        );

        combinedDeprecations = [...combinedDeprecations, ...enrichedDeprecationInfo];
      }

      return combinedDeprecations;
    }, [] as EnrichedDeprecationInfo[]);
  };

  const combinedDeprecations = await getCombinedDeprecations();
  const criticalWarnings = combinedDeprecations.filter(({ isCritical }) => isCritical === true);
  const sortByCritical = (a: EnrichedDeprecationInfo, b: EnrichedDeprecationInfo) => {
    return a.isCritical === b.isCritical ? 0 : a.isCritical ? -1 : 1;
  };

  return {
    readyForUpgrade: criticalWarnings.length === 0,
    deprecations: combinedDeprecations.sort(sortByCritical),
  };
}

// Reformats the index deprecations to an array of deprecation warnings extended with an index field.
const getCombinedIndexInfos = async (
  deprecations: MigrationDeprecationInfoResponse,
  dataClient: IScopedClusterClient
) => {
  const indices = Object.keys(deprecations.index_settings).reduce(
    (indexDeprecations, indexName) => {
      return indexDeprecations.concat(
        deprecations.index_settings[indexName].map(
          ({ details, message, url, level }) =>
            ({
              details,
              message,
              url,
              index: indexName,
              type: 'index_settings',
              isCritical: level === 'critical',
              correctiveAction: getCorrectiveAction(message),
            } as EnrichedDeprecationInfo)
        )
      );
    },
    [] as EnrichedDeprecationInfo[]
  );

  const indexNames = indices.map(({ index }) => index!);

  // If we have found deprecation information for index/indices
  // check whether the index is open or closed.
  if (indexNames.length) {
    const indexStates = await esIndicesStateCheck(dataClient.asCurrentUser, indexNames);

    indices.forEach((indexData) => {
      if (indexData.correctiveAction?.type === 'reindex') {
        indexData.correctiveAction.blockerForReindexing =
          indexStates[indexData.index!] === 'closed' ? 'index-closed' : undefined;
      }
    });
  }
  return indices as EnrichedDeprecationInfo[];
};

const getCorrectiveAction = (message: string): EnrichedDeprecationInfo['correctiveAction'] => {
  const indexSettingDeprecation = Object.values(indexSettingDeprecations).find(
    ({ deprecationMessage }) => deprecationMessage === message
  );
  const requiresReindexAction = /Index created before/.test(message);
  const requiresIndexSettingsAction = Boolean(indexSettingDeprecation);
  const requiresMlAction = /model snapshot/.test(message);

  if (requiresReindexAction) {
    return {
      type: 'reindex',
    };
  }

  if (requiresIndexSettingsAction) {
    return {
      type: 'indexSetting',
      deprecatedSettings: indexSettingDeprecation!.settings,
    };
  }

  if (requiresMlAction) {
    // This logic is brittle, as we are expecting the message to be in a particular format to extract the snapshot ID and job ID
    // Implementing https://github.com/elastic/elasticsearch/issues/73089 in ES should address this concern
    const regex = /(?<=\[).*?(?=\])/g;
    const matches = message.match(regex);

    if (matches?.length === 2) {
      return {
        type: 'mlSnapshot',
        snapshotId: matches[0],
        jobId: matches[1],
      };
    }
  }

  return undefined;
};
