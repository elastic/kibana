/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'kibana/server';
import { getPredictionFieldName, isRegressionAnalysis } from '../../../common/util/analytics_utils';

// Obtains data for the data frame analytics feature importance functionalities
// such as baseline, decision paths, or importance summary.
export function analyticsFeatureImportanceProvider({
  callAsCurrentUser,
  callAsInternalUser,
}: ILegacyScopedClusterClient) {
  async function getRegressionAnalyticsBaseline(analyticsId: string): Promise<number | undefined> {
    const results = await callAsInternalUser('ml.getDataFrameAnalytics', {
      analyticsId,
    });
    const jobConfig = results.data_frame_analytics[0];
    if (!isRegressionAnalysis) return undefined;
    const destinationIndex = jobConfig.dest.index;
    const predictionField = getPredictionFieldName(jobConfig.analysis);
    const params = {
      index: destinationIndex,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  'ml.is_training': true,
                },
              },
            ],
          },
        },
        aggs: {
          featureImportanceBaseline: {
            avg: {
              field: `ml.${predictionField}`,
            },
          },
        },
      },
    };
    let baseline;
    const aggregationResult = await callAsCurrentUser('search', params);
    if (aggregationResult) {
      baseline = aggregationResult.aggregations.featureImportanceBaseline.value;
    }
    return baseline;
  }

  return {
    getRegressionAnalyticsBaseline,
  };
}
