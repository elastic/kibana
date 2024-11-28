/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { EnrichedDeprecationInfo, ESUpgradeStatus, FeatureSet } from '../../../common/types';
import { getEnrichedDeprecations } from './migrations';
import { getHealthIndicators } from './health_indicators';

export async function getESUpgradeStatus(
  dataClient: IScopedClusterClient,
  featureSet: FeatureSet
): Promise<ESUpgradeStatus> {
  const getCombinedDeprecations = async () => {
    const healthIndicators = await getHealthIndicators(dataClient);
    const enrichedDeprecations = await getEnrichedDeprecations(dataClient);

    const toggledMigrationsDeprecations = enrichedDeprecations.filter(
      ({ type, correctiveAction }) => {
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
         * This disables showing the Data streams deprecations in the UA if
         * `featureSet.migrateDataStreams` is set to `false`.
         */
        if (!featureSet.migrateDataStreams) {
          if (type === 'data_streams') {
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
      }
    );

    const enrichedHealthIndicators = healthIndicators.filter(({ status }) => {
      return status !== 'green';
    }) as EnrichedDeprecationInfo[];

    return [...enrichedHealthIndicators, ...toggledMigrationsDeprecations];
  };

  const combinedDeprecations = await getCombinedDeprecations();
  const criticalWarnings = combinedDeprecations.filter(({ isCritical }) => isCritical === true);

  return {
    totalCriticalDeprecations: criticalWarnings.length,
    deprecations: combinedDeprecations,
  };
}
