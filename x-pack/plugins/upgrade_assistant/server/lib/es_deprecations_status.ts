/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient } from '@kbn/core/server';
import { EnrichedDeprecationInfo, ESUpgradeStatus } from '../../common/types';

import { esIndicesStateCheck } from './es_indices_state_check';
import {
  getESSystemIndicesMigrationStatus,
  convertFeaturesToIndicesArray,
} from './es_system_indices_migration';

export async function getESUpgradeStatus(
  dataClient: IScopedClusterClient
): Promise<ESUpgradeStatus> {
  const deprecations = await dataClient.asCurrentUser.migration.deprecations();

  const getCombinedDeprecations = async () => {
    const indices = await getCombinedIndexInfos(deprecations, dataClient);
    const systemIndices = await getESSystemIndicesMigrationStatus(dataClient.asCurrentUser);
    const systemIndicesList = convertFeaturesToIndicesArray(systemIndices.features);

    return Object.keys(deprecations).reduce((combinedDeprecations, deprecationType) => {
      if (deprecationType === 'index_settings') {
        // We need to exclude all index related deprecations for system indices since
        // they are resolved separately through the system indices upgrade section in
        // the Overview page.
        const withoutSystemIndices = indices.filter(
          (index) => !systemIndicesList.includes(index.index!)
        );

        combinedDeprecations = combinedDeprecations.concat(withoutSystemIndices);
      } else {
        const deprecationsByType = deprecations[
          deprecationType as keyof estypes.MigrationDeprecationsResponse
        ] as estypes.MigrationDeprecationsDeprecation[];

        const enrichedDeprecationInfo = deprecationsByType.map(
          ({
            details,
            level,
            message,
            url,
            // @ts-expect-error @elastic/elasticsearch _meta not available yet in MigrationDeprecationInfoResponse
            _meta: metadata,
            // @ts-expect-error @elastic/elasticsearch resolve_during_rolling_upgrade not available yet in MigrationDeprecationInfoResponse
            resolve_during_rolling_upgrade: resolveDuringUpgrade,
          }) => {
            return {
              details,
              message,
              url,
              type: deprecationType as keyof estypes.MigrationDeprecationsResponse,
              isCritical: level === 'critical',
              resolveDuringUpgrade,
              correctiveAction: getCorrectiveAction(message, metadata),
            };
          }
        );

        combinedDeprecations = combinedDeprecations.concat(enrichedDeprecationInfo);
      }

      return combinedDeprecations;
    }, [] as EnrichedDeprecationInfo[]);
  };

  const combinedDeprecations = await getCombinedDeprecations();
  const criticalWarnings = combinedDeprecations.filter(({ isCritical }) => isCritical === true);

  return {
    totalCriticalDeprecations: criticalWarnings.length,
    deprecations: combinedDeprecations,
  };
}

// Reformats the index deprecations to an array of deprecation warnings extended with an index field.
const getCombinedIndexInfos = async (
  deprecations: estypes.MigrationDeprecationsResponse,
  dataClient: IScopedClusterClient
) => {
  const indices = Object.keys(deprecations.index_settings).reduce(
    (indexDeprecations, indexName) => {
      return indexDeprecations.concat(
        deprecations.index_settings[indexName].map(
          ({
            details,
            message,
            url,
            level,
            // @ts-expect-error @elastic/elasticsearch _meta not available yet in MigrationDeprecationInfoResponse
            _meta: metadata,
            // @ts-expect-error @elastic/elasticsearch resolve_during_rolling_upgrade not available yet in MigrationDeprecationInfoResponse
            resolve_during_rolling_upgrade: resolveDuringUpgrade,
          }) =>
            ({
              details,
              message,
              url,
              index: indexName,
              type: 'index_settings',
              isCritical: level === 'critical',
              correctiveAction: getCorrectiveAction(message, metadata, indexName),
              resolveDuringUpgrade,
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

interface Action {
  action_type: 'remove_settings';
  objects: string[];
}

interface Actions {
  actions: Action[];
}

type EsMetadata = Actions & {
  [key: string]: string;
};

const getCorrectiveAction = (
  message: string,
  metadata: EsMetadata,
  indexName?: string
): EnrichedDeprecationInfo['correctiveAction'] => {
  const indexSettingDeprecation = metadata?.actions?.find(
    (action) => action.action_type === 'remove_settings' && indexName
  );
  const clusterSettingDeprecation = metadata?.actions?.find(
    (action) => action.action_type === 'remove_settings' && typeof indexName === 'undefined'
  );
  const requiresReindexAction = /Index created before/.test(message);
  const requiresIndexSettingsAction = Boolean(indexSettingDeprecation);
  const requiresClusterSettingsAction = Boolean(clusterSettingDeprecation);
  const requiresMlAction = /[Mm]odel snapshot/.test(message);

  if (requiresReindexAction) {
    return {
      type: 'reindex',
    };
  }

  if (requiresIndexSettingsAction) {
    return {
      type: 'indexSetting',
      deprecatedSettings: indexSettingDeprecation!.objects,
    };
  }

  if (requiresClusterSettingsAction) {
    return {
      type: 'clusterSetting',
      deprecatedSettings: clusterSettingDeprecation!.objects,
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
