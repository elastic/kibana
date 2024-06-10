/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { EnrichedDeprecationInfo, ESUpgradeStatus, FeatureSet } from '../../common/types';
import { esIndicesStateCheck } from './es_indices_state_check';
import {
  getESSystemIndicesMigrationStatus,
  convertFeaturesToIndicesArray,
} from './es_system_indices_migration';

export function getShardCapacityDeprecationInfo({
  symptom,
  details,
}: {
  details: any;
  symptom: any;
}) {
  const causes = [];
  if (details.indices_with_readonly_block > 0) {
    causes.push(
      i18n.translate(
        'xpack.upgradeAssistant.esDeprecationsStatus.indicesWithReadonlyBlockCauseMessage',
        {
          defaultMessage:
            'The number of indices the system enforced a read-only index block (`index.blocks.read_only_allow_delete`) on because the cluster is running out of space.',
        }
      )
    );
  }

  if (details.nodes_over_high_watermark > 0) {
    causes.push(
      i18n.translate(
        'xpack.upgradeAssistant.esDeprecationsStatus.nodesOverHighWatermarkCauseMessage',
        {
          defaultMessage:
            'The number of nodes that are running low on disk and it is likely that they will run out of space. Their disk usage has tripped the <<cluster-routing-watermark-high, high watermark threshold>>.',
          ignoreTag: true,
        }
      )
    );
  }

  if (details.nodes_over_flood_stage_watermark > 0) {
    causes.push(
      i18n.translate(
        'xpack.upgradeAssistant.esDeprecationsStatus.nodesOverFloodStageWatermarkCauseMessage',
        {
          defaultMessage:
            'The number of nodes that have run out of disk. Their disk usage has tripped the <<cluster-routing-flood-stage, flood stagewatermark threshold>>.',
          ignoreTag: true,
        }
      )
    );
  }

  return {
    details: symptom,
    message: symptom,
    url: null,
    resolveDuringUpgrade: false,
    correctiveAction: {
      type: 'healthIndicator',
      impacts: details,
      cause: causes.join('\n'),
    },
  };
}

export async function getHealthIndicators(
  dataClient: IScopedClusterClient
): Promise<EnrichedDeprecationInfo[]> {
  const healthIndicators = await dataClient.asCurrentUser.healthReport();
  const isStatusNotGreen = (indicator?: estypes.HealthReportBaseIndicator): boolean => {
    return !!(indicator?.status && indicator?.status !== 'green');
  };

  // Temporarily ignoring due to untyped ES indicators
  // types will be available during 8.9.0
  // @ts-ignore
  return [
    ...[
      // @ts-ignore
      healthIndicators.indicators.shards_capacity as estypes.HealthReportBaseIndicator,
    ]
      .filter(isStatusNotGreen)
      .flatMap(({ status, symptom, impacts, diagnosis }) => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        return (diagnosis || []).map(({ cause, action, help_url }) => ({
          type: 'health_indicator',
          details: symptom,
          message: cause,
          url: help_url,
          isCritical: status === 'red',
          resolveDuringUpgrade: false,
          correctiveAction: { type: 'healthIndicator', cause, action, impacts },
        }));
      }),
    ...[healthIndicators.indicators.disk as estypes.HealthReportDiskIndicator]
      .filter(isStatusNotGreen)
      .flatMap(({ status, symptom, details }) => {
        return {
          type: 'health_indicator',
          isCritical: status === 'red',
          ...getShardCapacityDeprecationInfo({ symptom, details }),
        };
      }),
  ];
}

export async function getESUpgradeStatus(
  dataClient: IScopedClusterClient,
  featureSet: FeatureSet
): Promise<ESUpgradeStatus> {
  const getCombinedDeprecations = async () => {
    const healthIndicators = await getHealthIndicators(dataClient);
    const deprecations = await dataClient.asCurrentUser.migration.deprecations();
    const indices = await getCombinedIndexInfos(deprecations, dataClient);
    const systemIndices = await getESSystemIndicesMigrationStatus(dataClient.asCurrentUser);
    const systemIndicesList = convertFeaturesToIndicesArray(systemIndices.features);

    const enrichedDeprecations = Object.keys(deprecations).reduce(
      (combinedDeprecations, deprecationType) => {
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

          const enrichedDeprecationInfo = deprecationsByType
            .map(
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
            )
            .filter(({ correctiveAction, type }) => {
              /**
               * This disables showing the ML deprecations in the UA if `featureSet.mlSnapshots`
               * is set to `false`.
               *
               * This config should be set to true only on the `x.last` versions, or when
               * the constant `MachineLearningField.MIN_CHECKED_SUPPORTED_SNAPSHOT_VERSION`
               * is incremented to something higher than 7.0.0 in the Elasticsearch code.
               */
              if (!featureSet.mlSnapshots) {
                if (type === 'ml_settings' || correctiveAction?.type === 'mlSnapshot') {
                  return false;
                }
              }

              /**
               * This disables showing the reindexing deprecations in the UA if
               * `featureSet.reindexCorrectiveActions` is set to `false`.
               */
              if (!featureSet.reindexCorrectiveActions && correctiveAction?.type === 'reindex') {
                return false;
              }

              return true;
            });

          combinedDeprecations = combinedDeprecations.concat(enrichedDeprecationInfo);
        }

        return combinedDeprecations;
      },
      [] as EnrichedDeprecationInfo[]
    );

    const enrichedHealthIndicators = healthIndicators.filter(({ status }) => {
      return status !== 'green';
    }) as EnrichedDeprecationInfo[];

    return [...enrichedHealthIndicators, ...enrichedDeprecations];
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
