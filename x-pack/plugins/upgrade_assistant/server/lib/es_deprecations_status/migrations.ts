/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { EnrichedDeprecationInfo } from '../../../common/types';

import {
  convertFeaturesToIndicesArray,
  getESSystemIndicesMigrationStatus,
} from '../es_system_indices_migration';
import { getCorrectiveAction } from './get_corrective_actions';
import { esIndicesStateCheck } from '../es_indices_state_check';

/**
 * Remove once the data_streams type is added to the `MigrationDeprecationsResponse` type
 */
interface EsDeprecations extends estypes.MigrationDeprecationsResponse {
  data_streams: Record<string, estypes.MigrationDeprecationsDeprecation[]>;
}

// "data_streams" : {
//   "my-v7-data-stream" : [
//     {
//       "level" : "critical",
//       "message" : "Old data stream with a compatibility version < 8.0",
//       "url" : "https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-9.0.html",
//       "details" : "This data stream has backing indices that were created before Elasticsearch 8.0.0",
//       "resolve_during_rolling_upgrade" : false,
//       "_meta": {
//         "backing_indices": {
//           "count": 52,
//           "need_upgrading": {
//             "count": 37,
//             "searchable_snapshot": {
//               "count": 23,
//               "fully_mounted": {
//                 "count": 7
//               },
//               "partially_mounted": {
//                 "count": 16
//               }
//             }
//           }
//         }
//       }
//     }
//   ]
// }

const createBaseMigrationDeprecation = (
  migrationDeprecation: estypes.MigrationDeprecationsDeprecation,
  { deprecationType, indexName }: { deprecationType: keyof EsDeprecations; indexName?: string }
): EnrichedDeprecationInfo => {
  const {
    details,
    message,
    url,
    level,
    // @ts-expect-error @elastic/elasticsearch _meta not available yet in MigrationDeprecationInfoResponse
    _meta: metadata,
    // @ts-expect-error @elastic/elasticsearch resolve_during_rolling_upgrade not available yet in MigrationDeprecationInfoResponse
    resolve_during_rolling_upgrade: resolveDuringUpgrade,
  } = migrationDeprecation;

  return {
    index: indexName,
    type: deprecationType,
    details,
    message,
    url,
    isCritical: level === 'critical',
    correctiveAction: getCorrectiveAction(message, metadata, indexName),
    resolveDuringUpgrade,
  };
};
export const getEnrichedDeprecations = async (
  dataClient: IScopedClusterClient
): Promise<EnrichedDeprecationInfo[]> => {
  const deprecations = await dataClient.asCurrentUser.migration.deprecations();
  const systemIndices = await getESSystemIndicesMigrationStatus(dataClient.asCurrentUser);

  const systemIndicesList = convertFeaturesToIndicesArray(systemIndices.features);

  const indexSettingsIndexNames = Object.keys(deprecations.index_settings).map(
    (indexName) => indexName!
  );
  const indexSettingsIndexStates = indexSettingsIndexNames.length
    ? await esIndicesStateCheck(dataClient.asCurrentUser, indexSettingsIndexNames)
    : {};

  return Object.entries(deprecations)
    .map(([deprecationType, deprecationsByType]) => {
      switch (deprecationType as keyof EsDeprecations) {
        case 'index_settings': {
          return Object.keys(deprecations.index_settings)
            .filter((indexName) => {
              // filter out system indices
              return !systemIndicesList.includes(indexName!);
            })
            .map((indexName) => {
              const enrichedDeprecation = createBaseMigrationDeprecation(deprecationsByType, {
                indexName,
                deprecationType,
              });

              // If we have found deprecation information for index/indices
              // check whether the index is open or closed.
              if (enrichedDeprecation.correctiveAction?.type === 'reindex') {
                enrichedDeprecation.correctiveAction.blockerForReindexing =
                  indexSettingsIndexStates[enrichedDeprecation.index!] === 'closed'
                    ? 'index-closed'
                    : undefined;
              }

              return enrichedDeprecation;
            })
            .flat();
        }
        case 'data_streams': {
          return Object.entries(deprecationsByType).map(([indexName, dataSteamDeprecations]) => {
            return dataSteamDeprecations.map((depractionData) =>
              createBaseMigrationDeprecation(depractionData, { indexName, deprecationType })
            );
          });
        }
        case 'ml_settings':
        case 'node_settings':
        case 'cluster_settings': {
          return deprecationsByType.map((depractionData) =>
            createBaseMigrationDeprecation(depractionData, { deprecationType })
          );
        }
        default: {
          throw new Error(`Unknown ES deprecation type "${deprecationType}"`);
        }
      }
    })
    .flat();
};
