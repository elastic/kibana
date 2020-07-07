/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'kibana/server';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { PromiseReturnType } from '../../../typings/common';

export type TopAnomaliesResponse = PromiseReturnType<typeof getTopAnomalies>;

export async function getTopAnomalies(
  {
    setup,
    logger,
  }: {
    setup: Setup & SetupTimeRange;
    logger: Logger;
  },
  environment: string
) {
  const { ml, start, end } = setup;

  if (!ml) {
    logger.warn('Anomaly detection plugin is not available.');
    return [];
  }
  const mlCapabilities = await ml.mlSystem.mlCapabilities();
  if (!mlCapabilities.mlFeatureEnabledInSpace) {
    logger.warn('Anomaly detection feature is not enabled for the space.');
    return [];
  }
  if (!mlCapabilities.isPlatinumOrTrialLicense) {
    logger.warn(
      'Unable to create anomaly detection jobs due to insufficient license.'
    );
    return [];
  }

  const mlJobId = await getMLJobId(ml, environment);

  const params = {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              term: {
                result_type: 'record',
              },
            },
            {
              term: {
                job_id: mlJobId,
              },
            },
            {
              range: {
                timestamp: {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
      aggs: {
        service_name: {
          terms: {
            field: 'partition_field_value',
          },
          aggs: {
            transaction_type: {
              terms: {
                field: 'by_field_value',
              },
              aggs: {
                top_score: {
                  top_metrics: {
                    metrics: [
                      {
                        field: 'actual',
                      },
                    ],
                    sort: {
                      record_score: 'desc',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const response = await ml.mlSystem.mlAnomalySearch(params);
  return transformTopAnomalies(response as TopAnomaliesAggResponse);
}

interface TopAnomaliesAggResponse {
  aggregations: {
    service_name: {
      buckets: Array<{
        key: string;
        transaction_type: {
          buckets: Array<{
            key: string;
            top_score: {
              top: [{ sort: [number]; metrics: { actual: number } }];
            };
          }>;
        };
      }>;
    };
  };
}

function transformTopAnomalies(response: TopAnomaliesAggResponse) {
  const services = response.aggregations.service_name.buckets.map(
    ({ key: serviceName, transaction_type: transactionTypeAgg }) => {
      return {
        'service.name': serviceName,
        anomalies: transactionTypeAgg.buckets.map(
          ({ key: transactionType, top_score: topScoreAgg }) => {
            return {
              'transaction.type': transactionType,
              anomaly_score: topScoreAgg.top[0].sort[0],
              actual_value: topScoreAgg.top[0].metrics.actual,
            };
          }
        ),
      };
    }
  );
  return services;
}

export async function getMLJobId(
  ml: Required<Setup>['ml'],
  environment: string
) {
  const response = await ml.anomalyDetectors.jobs('apm');
  const matchingMLJobs = response.jobs.filter(
    (anomalyDetectionJob) =>
      // TODO [ML] remove this since job_tags is defined in another branch
      // @ts-ignore
      anomalyDetectionJob.custom_settings?.job_tags?.environment === environment
  );
  if (matchingMLJobs.length === 0) {
    throw new Error(`ML job Not Found for environment "${environment}".`);
  }
  return matchingMLJobs[0].job_id;
}
