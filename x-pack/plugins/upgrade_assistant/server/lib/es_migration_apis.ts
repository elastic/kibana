/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'src/core/server';
import { indexSettingDeprecations } from '../../common/constants';
import {
  DeprecationAPIResponse,
  EnrichedDeprecationInfo,
  UpgradeAssistantStatus,
} from '../../common/types';

import { esIndicesStateCheck } from './es_indices_state_check';

export async function getUpgradeAssistantStatus(
  dataClient: IScopedClusterClient
): Promise<UpgradeAssistantStatus> {
  const { body: deprecations } = await dataClient.asCurrentUser.migration.deprecations();

  const cluster = getClusterDeprecations(deprecations);
  const indices = await getCombinedIndexInfos(deprecations, dataClient);

  const criticalWarnings = cluster.concat(indices).filter((d) => d.level === 'critical');

  return {
    readyForUpgrade: criticalWarnings.length === 0,
    cluster: [
      {
        level: 'critical',
        message:
          'model snapshot [1] for job [deprecation_check_job] needs to be deleted or upgraded',
        url: '',
        details:
          'model snapshot [%s] for job [%s] supports minimum version [%s] and needs to be at least [%s]',
        correctiveAction: {
          type: 'mlSnapshot',
          jobId: 'my_job', // ID of your ML job
          snapshotId: '1621449683', // ID of an older snapshot associated with the job ID defined (cannot be snapshot currently in use)
        },
      },
    ],
    indices,
  };
}

// Reformats the index deprecations to an array of deprecation warnings extended with an index field.
const getCombinedIndexInfos = async (
  deprecations: DeprecationAPIResponse,
  dataClient: IScopedClusterClient
) => {
  const indices = Object.keys(deprecations.index_settings).reduce(
    (indexDeprecations, indexName) => {
      return indexDeprecations.concat(
        deprecations.index_settings[indexName].map(
          (d) =>
            ({
              ...d,
              index: indexName,
              correctiveAction: getCorrectiveAction(d.message),
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

const getClusterDeprecations = (deprecations: DeprecationAPIResponse) => {
  const combinedDeprecations = deprecations.cluster_settings
    .concat(deprecations.ml_settings)
    .concat(deprecations.node_settings);

  return combinedDeprecations.map((deprecation) => {
    return {
      ...deprecation,
      correctiveAction: getCorrectiveAction(deprecation.message),
    };
  }) as EnrichedDeprecationInfo[];
};

const getCorrectiveAction = (message: string) => {
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
