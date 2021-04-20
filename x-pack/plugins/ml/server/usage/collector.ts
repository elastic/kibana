/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '../../../../../src/plugins/usage_collection/server';
import { PLUGIN_ID } from '../../common/constants/app';
import { ML_ALERT_TYPES } from '../../common/constants/alerts';
import { ANOMALY_RESULT_TYPE } from '../../common/constants/anomalies';
import { AnomalyResultType } from '../../common/types/anomalies';

export interface MlUsageData {
  alertRules: {
    [ML_ALERT_TYPES.ANOMALY_DETECTION]: {
      count_by_result_type: {
        [key in AnomalyResultType]: number;
      };
    };
  };
}

export function registerCollector(usageCollection: UsageCollectionSetup) {
  const collector = usageCollection.makeUsageCollector<MlUsageData>({
    type: PLUGIN_ID,
    schema: {
      alertRules: {
        [ML_ALERT_TYPES.ANOMALY_DETECTION]: {
          count_by_result_type: {
            [ANOMALY_RESULT_TYPE.RECORD]: { type: 'long' },
            [ANOMALY_RESULT_TYPE.INFLUENCER]: { type: 'long' },
            [ANOMALY_RESULT_TYPE.BUCKET]: { type: 'long' },
          },
        },
      },
    },
    isReady: () => true,
    fetch: async ({ esClient }) => {
      const result = await esClient.search({
        index: '.kibana*',
        size: 0,
        body: {
          query: {
            bool: {
              filter: [
                { term: { type: 'alert' } },
                {
                  term: {
                    'alert.alertTypeId': ML_ALERT_TYPES.ANOMALY_DETECTION,
                  },
                },
              ],
            },
          },
          aggs: {
            count_by_result_type: {
              terms: {
                field: 'alert.params.resultType',
                size: 3,
              },
            },
          },
        },
      });

      const aggResponse = result.body.aggregations as {
        count_by_result_type: {
          buckets: Array<{
            key: AnomalyResultType;
            doc_count: number;
          }>;
        };
      };
      const countByResultType = aggResponse.count_by_result_type.buckets.reduce((acc, curr) => {
        acc[curr.key] = curr.doc_count;
        return acc;
      }, {} as MlUsageData['alertRules'][typeof ML_ALERT_TYPES.ANOMALY_DETECTION]['count_by_result_type']);

      return {
        alertRules: {
          [ML_ALERT_TYPES.ANOMALY_DETECTION]: {
            count_by_result_type: countByResultType,
          },
        },
      };
    },
  });

  usageCollection.registerCollector(collector);
}
