/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '../../../../../src/plugins/usage_collection/server';
import { ML_ALERT_TYPES } from '../../common/constants/alerts';
import { AnomalyResultType } from '../../common/types/anomalies';

export interface MlUsageData {
  alertRules: {
    'xpack.ml.anomaly_detection_alert': {
      count_by_result_type: {
        record: number;
        bucket: number;
        influencer: number;
      };
    };
  };
}

export function registerCollector(usageCollection: UsageCollectionSetup, kibanaIndex: string) {
  const collector = usageCollection.makeUsageCollector<MlUsageData>({
    type: 'ml',
    schema: {
      alertRules: {
        'xpack.ml.anomaly_detection_alert': {
          count_by_result_type: {
            record: {
              type: 'long',
              _meta: { description: 'total number of alerting rules using record result type' },
            },
            influencer: {
              type: 'long',
              _meta: { description: 'total number of alerting rules using influencer result type' },
            },
            bucket: {
              type: 'long',
              _meta: { description: 'total number of alerting rules using bucket result type' },
            },
          },
        },
      },
    },
    isReady: () => !!kibanaIndex,
    fetch: async ({ esClient }) => {
      const result = await esClient.search({
        index: kibanaIndex,
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
