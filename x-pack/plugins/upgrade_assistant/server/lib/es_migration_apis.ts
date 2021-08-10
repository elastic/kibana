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
      {
        level: 'warning',
        message: "A Cluster name cannot contain ':'",
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/7.0/breaking-changes-7.0.html#_literal_literal_is_no_longer_allowed_in_cluster_name',
        details:
          "This cluster is named [mycompany:logging], which contains the illegal character ':'.",
      },
      {
        level: 'warning',
        message: "A Cluster name cannot contain ':'",
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/7.0/breaking-changes-7.0.html#_literal_literal_is_no_longer_allowed_in_cluster_name',
        details:
          "This cluster is named [mycompany:logging], which contains the illegal character ':'.",
      },
      {
        level: 'warning',
        message: "A Cluster name cannot contain ':'",
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/7.0/breaking-changes-7.0.html#_literal_literal_is_no_longer_allowed_in_cluster_name',
        details:
          "This cluster is named [mycompany:logging], which contains the illegal character ':'.",
      },
      {
        level: 'warning',
        message: "D Cluster name cannot contain ':'",
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/7.0/breaking-changes-7.0.html#_literal_literal_is_no_longer_allowed_in_cluster_name',
        details:
          "This cluster is named [mycompany:logging], which contains the illegal character ':'.",
      },
      {
        level: 'warning',
        message: "E Cluster name cannot contain ':'",
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/7.0/breaking-changes-7.0.html#_literal_literal_is_no_longer_allowed_in_cluster_name',
        details:
          "This cluster is named [mycompany:logging], which contains the illegal character ':'.",
      },
      {
        level: 'warning',
        message: "F Cluster name cannot contain ':'",
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/7.0/breaking-changes-7.0.html#_literal_literal_is_no_longer_allowed_in_cluster_name',
        details:
          "This cluster is named [mycompany:logging], which contains the illegal character ':'.",
      },
      {
        level: 'warning',
        message: "G Cluster name cannot contain ':'",
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/7.0/breaking-changes-7.0.html#_literal_literal_is_no_longer_allowed_in_cluster_name',
        details:
          "This cluster is named [mycompany:logging], which contains the illegal character ':'.",
      },
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
      logs2: [
        {
          level: 'warning',
          message: 'translog retention settings are ignored',
          url:
            'https://www.elastic.co/guide/en/elasticsearch/reference/7.0/breaking-changes-7.0.html#_literal_literal_is_no_longer_allowed_in_index_name',
          details: "This index is named [logs:apache], which contains the illegal character ':'.",
        },
        {
          level: 'critical',
          message: 'Index created before 7.0',
          url:
            'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html',
          details: 'This index was created using version: 6.8.13',
        },
      ],
    },
    ml_settings: [
      {
        level: 'critical',
        message: 'model snapshot [1627343998] for job [my_job] needs to be deleted or upgraded',
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

const getCorrectiveAction = (
  message: string,
  metadata?: { [key: string]: string }
): EnrichedDeprecationInfo['correctiveAction'] => {
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
    const { snapshot_id: snapshotId, job_id: jobId } = metadata!;

    return {
      type: 'mlSnapshot',
      snapshotId,
      jobId,
    };
  }
};
