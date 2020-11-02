/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from '@hapi/boom';
import { getServiceHealthStatus } from '../../../common/service_health_status';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { PromiseReturnType } from '../../../typings/common';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../common/transaction_types';
import {
  ServiceAnomalyStats,
  getSeverity,
  ML_ERRORS,
} from '../../../common/anomaly_detection';
import { getMlJobsWithAPMGroup } from '../anomaly_detection/get_ml_jobs_with_apm_group';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { MlPluginSetup } from '../../../../ml/server';

export const DEFAULT_ANOMALIES = { mlJobIds: [], serviceAnomalies: {} };

export type ServiceAnomaliesResponse = PromiseReturnType<
  typeof getServiceAnomalies
>;

export async function getServiceAnomalies({
  setup,
  environment,
}: {
  setup: Setup & SetupTimeRange;
  environment?: string;
}) {
  const { ml, start, end } = setup;

  if (!ml) {
    throw Boom.notImplemented(ML_ERRORS.ML_NOT_AVAILABLE);
  }

  const mlCapabilities = await ml.mlSystem.mlCapabilities();

  if (!mlCapabilities.mlFeatureEnabledInSpace) {
    throw Boom.forbidden(ML_ERRORS.ML_NOT_AVAILABLE_IN_SPACE);
  }

  const mlJobIds = await getMLJobIds(ml.anomalyDetectors, environment);

  if (!mlJobIds.length) {
    return {
      mlJobIds: [],
      serviceAnomalies: {},
    };
  }

  const params = {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { terms: { result_type: ['model_plot', 'record'] } },
            { terms: { job_id: mlJobIds } },
            {
              range: {
                timestamp: {
                  // fetch data for at least 30 minutes
                  gte: Math.min(end - 30 * 60 * 1000, start),
                  lte: end,
                  format: 'epoch_millis',
                },
              },
            },
            {
              terms: {
                // Only retrieving anomalies for transaction types "request" and "page-load"
                by_field_value: [TRANSACTION_REQUEST, TRANSACTION_PAGE_LOAD],
              },
            },
          ],
        },
      },
      aggs: {
        services: {
          terms: { field: 'partition_field_value' },
          aggs: {
            top_score: {
              top_hits: {
                sort: { record_score: 'desc' },
                _source: [
                  'actual',
                  'job_id',
                  'by_field_value',
                  'result_type',
                  'record_score',
                ],
                size: 1,
              },
            },
          },
        },
      },
    },
  };

  const response = await ml.mlSystem.mlAnomalySearch(params, mlJobIds);

  return {
    mlJobIds,
    serviceAnomalies: transformResponseToServiceAnomalies(
      response as ServiceAnomaliesAggResponse
    ),
  };
}

interface ServiceAnomaliesAggResponse {
  aggregations: {
    services: {
      buckets: Array<{
        key: string;
        top_score: {
          hits: {
            hits: Array<{
              sort: [number];
              _source: {
                job_id: string;
                by_field_value: string;
              } & (
                | {
                    record_score: number | null;
                    result_type: 'record';
                    actual: number[];
                  }
                | {
                    result_type: 'model_plot';
                    actual?: number;
                  }
              );
            }>;
          };
        };
      }>;
    };
  };
}

function transformResponseToServiceAnomalies(
  response: ServiceAnomaliesAggResponse
) {
  const serviceAnomaliesMap = (
    response.aggregations?.services.buckets ?? []
  ).reduce<Record<string, ServiceAnomalyStats>>(
    (statsByServiceName, { key: serviceName, top_score: topScoreAgg }) => {
      const mlResult = topScoreAgg.hits.hits[0]._source;

      const anomalyScore =
        (mlResult.result_type === 'record' && mlResult.record_score) || 0;

      const severity = getSeverity(anomalyScore);
      const healthStatus = getServiceHealthStatus({ severity });

      return {
        ...statsByServiceName,
        [serviceName]: {
          transactionType: mlResult.by_field_value,
          jobId: mlResult.job_id,
          actualValue:
            mlResult.result_type === 'record'
              ? mlResult.actual[0]
              : mlResult.actual,
          anomalyScore,
          healthStatus,
        },
      };
    },
    {}
  );

  return serviceAnomaliesMap;
}

export async function getMLJobs(
  anomalyDetectors: ReturnType<MlPluginSetup['anomalyDetectorsProvider']>,
  environment?: string
) {
  const response = await getMlJobsWithAPMGroup(anomalyDetectors);

  // to filter out legacy jobs we are filtering by the existence of `apm_ml_version` in `custom_settings`
  // and checking that it is compatable.
  const mlJobs = response.jobs.filter(
    (job) => (job.custom_settings?.job_tags?.apm_ml_version ?? 0) >= 2
  );
  if (environment && environment !== ENVIRONMENT_ALL.value) {
    const matchingMLJob = mlJobs.find(
      (job) => job.custom_settings?.job_tags?.environment === environment
    );
    if (!matchingMLJob) {
      return [];
    }
    return [matchingMLJob];
  }
  return mlJobs;
}

export async function getMLJobIds(
  anomalyDetectors: ReturnType<MlPluginSetup['anomalyDetectorsProvider']>,
  environment?: string
) {
  const mlJobs = await getMLJobs(anomalyDetectors, environment);
  return mlJobs.map((job) => job.job_id);
}
