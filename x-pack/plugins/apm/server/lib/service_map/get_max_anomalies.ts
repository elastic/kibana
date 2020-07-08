/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'kibana/server';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { PromiseReturnType } from '../../../typings/common';
import { ML_GROUP_NAME_APM } from '../anomaly_detection/create_anomaly_detection_jobs';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../common/transaction_types';
import {
  TRANSACTION_TYPE,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { MaxAnomaly } from '../../../common/anomaly_detection';

const DEFAULT_VALUE = {
  mlJobIds: [],
  maxAnomalies: [],
};

export type MaxAnomaliesResponse = PromiseReturnType<typeof getMaxAnomalies>;

export async function getMaxAnomalies({
  setup,
  logger,
  environment,
}: {
  setup: Setup & SetupTimeRange;
  logger: Logger;
  environment?: string;
}) {
  const { ml, start, end } = setup;

  if (!ml) {
    logger.warn('Anomaly detection plugin is not available.');
    return DEFAULT_VALUE;
  }
  const mlCapabilities = await ml.mlSystem.mlCapabilities();
  if (!mlCapabilities.mlFeatureEnabledInSpace) {
    logger.warn('Anomaly detection feature is not enabled for the space.');
    return DEFAULT_VALUE;
  }
  if (!mlCapabilities.isPlatinumOrTrialLicense) {
    logger.warn(
      'Unable to create anomaly detection jobs due to insufficient license.'
    );
    return DEFAULT_VALUE;
  }

  let mlJobIds: string[] = [];
  try {
    mlJobIds = await getMLJobIds(ml, environment);
  } catch (error) {
    logger.error(error);
    return DEFAULT_VALUE;
  }

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
              terms: {
                job_id: mlJobIds,
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
            {
              terms: {
                by_field_value: [TRANSACTION_REQUEST, TRANSACTION_PAGE_LOAD],
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
            top_score: {
              top_hits: {
                sort: {
                  record_score: 'desc',
                },
                _source: {
                  includes: ['actual', 'job_id', 'by_field_value'],
                },
                size: 1,
              },
            },
          },
        },
      },
    },
  };
  const response = await ml.mlSystem.mlAnomalySearch(params);
  return {
    mlJobIds,
    maxAnomalies: transformResponseToMaxAnomalies(
      response as MaxAnomaliesAggResponse
    ),
  };
}

interface MaxAnomaliesAggResponse {
  aggregations: {
    service_name: {
      buckets: Array<{
        key: string;
        top_score: {
          hits: {
            hits: Array<{
              sort: [number];
              _source: {
                actual: [number];
                job_id: string;
                by_field_value: string;
              };
            }>;
          };
        };
      }>;
    };
  };
}

function transformResponseToMaxAnomalies(
  response: MaxAnomaliesAggResponse
): Array<{
  [SERVICE_NAME]: string;
  maxAnomaly: MaxAnomaly;
}> {
  const services = response.aggregations.service_name.buckets.map(
    ({ key: serviceName, top_score: topScoreAgg }) => {
      return {
        [SERVICE_NAME]: serviceName,
        maxAnomaly: {
          [TRANSACTION_TYPE]: topScoreAgg.hits.hits[0]?._source?.by_field_value,
          anomaly_score: topScoreAgg.hits.hits[0]?.sort?.[0],
          actual_value: topScoreAgg.hits.hits[0]?._source?.actual?.[0],
          job_id: topScoreAgg.hits.hits[0]?._source?.job_id,
        },
      };
    }
  );
  return services;
}

export async function getMLJobIds(
  ml: Required<Setup>['ml'],
  environment?: string
) {
  const response = await ml.anomalyDetectors.jobs(ML_GROUP_NAME_APM);
  const apmAnomalyDetectionMLJobs = response.jobs.filter(
    (job) => job.custom_settings?.job_tags?.environment
  );
  if (environment) {
    const matchingMLJob = apmAnomalyDetectionMLJobs.find(
      (job) => job.custom_settings?.job_tags?.environment === environment
    );
    if (!matchingMLJob) {
      throw new Error(`ML job Not Found for environment "${environment}".`);
    }
    return [matchingMLJob.job_id];
  }
  return apmAnomalyDetectionMLJobs.map((job) => job.job_id);
}
