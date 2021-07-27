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
  // const { body: deprecations } = await dataClient.asCurrentUser.migration.deprecations();

  const deprecations = {
    cluster_settings: [],
    node_settings: [],
    index_settings: {},
    ml_settings: [
      {
        level: 'critical',
        message: 'model snapshot [1627343998] for job [my_job] needs to be deleted or upgraded',
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/master/ml-upgrade-job-model-snapshot.html',
        details:
          "model snapshot [1627343998] for job [my_job] supports minimum version [6.3.0] and needs to be at least [7.0.0]. The model snapshot's latest record timestamp is [2021-07-23T03:48:47.000Z]",
        _meta: {
          snapshot_id: '1627392073', // ID of an older snapshot associated with the job ID defined (cannot be snapshot currently in use)
          job_id: 'my_job', // ID of your ML job
        },
      },
    ],
  };

  const cluster = getClusterDeprecations(deprecations);
  const indices = await getCombinedIndexInfos(deprecations, dataClient);

  const criticalWarnings = cluster.concat(indices).filter((d) => d.level === 'critical');

  return {
    readyForUpgrade: criticalWarnings.length === 0,
    cluster,
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
    const { _meta: metadata, ...deprecationInfo } = deprecation;
    return {
      ...deprecationInfo,
      correctiveAction: getCorrectiveAction(deprecation.message, metadata),
    };
  }) as EnrichedDeprecationInfo[];
};

const getCorrectiveAction = (message: string, metadata?: { [key: string]: string }) => {
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
