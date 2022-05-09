/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { ML_ALERT_TYPES } from '../../common/constants/alerts';
import { AnomalyResultType } from '../../common/types/anomalies';
import { MlAnomalyDetectionJobsHealthRuleParams } from '../../common/types/alerts';
import { getResultJobsHealthRuleConfig } from '../../common/util/alerts';

export interface MlUsageData {
  alertRules: {
    'xpack.ml.anomaly_detection_alert': {
      count_by_result_type: {
        record: number;
        bucket: number;
        influencer: number;
      };
    };
    'xpack.ml.anomaly_detection_jobs_health': {
      count_by_check_type: {
        datafeed: number;
        mml: number;
        delayedData: number;
        errorMessages: number;
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
        'xpack.ml.anomaly_detection_jobs_health': {
          count_by_check_type: {
            datafeed: {
              type: 'long',
              _meta: {
                description:
                  'total number of alerting rules performing the not started datafeed health check',
              },
            },
            mml: {
              type: 'long',
              _meta: {
                description:
                  'total number of alerting rules performing the model memory limit health check',
              },
            },
            delayedData: {
              type: 'long',
              _meta: {
                description:
                  'total number of alerting rules performing the delayed data health check',
              },
            },
            errorMessages: {
              type: 'long',
              _meta: {
                description:
                  'total number of alerting rules performing the error messages health check',
              },
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

      const aggResponse = result.aggregations as {
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

      const jobsHealthRuleInstances = await esClient.search<{
        alert: {
          params: MlAnomalyDetectionJobsHealthRuleParams;
        };
      }>({
        index: kibanaIndex,
        size: 10000,
        body: {
          query: {
            bool: {
              filter: [
                { term: { type: 'alert' } },
                {
                  term: {
                    'alert.alertTypeId': ML_ALERT_TYPES.AD_JOBS_HEALTH,
                  },
                },
              ],
            },
          },
        },
      });

      const resultsByCheckType = jobsHealthRuleInstances.hits.hits.reduce(
        (acc, curr) => {
          const doc = curr._source;
          if (!doc) return acc;

          const {
            alert: {
              params: { testsConfig },
            },
          } = doc;

          const resultConfig = getResultJobsHealthRuleConfig(testsConfig);

          acc.datafeed += resultConfig.datafeed.enabled ? 1 : 0;
          acc.mml += resultConfig.mml.enabled ? 1 : 0;
          acc.delayedData += resultConfig.delayedData.enabled ? 1 : 0;
          acc.errorMessages += resultConfig.errorMessages.enabled ? 1 : 0;

          return acc;
        },
        {
          datafeed: 0,
          mml: 0,
          delayedData: 0,
          errorMessages: 0,
        }
      );

      return {
        alertRules: {
          [ML_ALERT_TYPES.ANOMALY_DETECTION]: {
            count_by_result_type: countByResultType,
          },
          [ML_ALERT_TYPES.AD_JOBS_HEALTH]: {
            count_by_check_type: resultsByCheckType,
          },
        },
      };
    },
  });

  usageCollection.registerCollector(collector);
}
