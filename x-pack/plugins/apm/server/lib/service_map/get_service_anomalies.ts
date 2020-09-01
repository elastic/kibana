/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'kibana/server';
import Boom from 'boom';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { PromiseReturnType } from '../../../typings/common';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../common/transaction_types';
import {
  ServiceAnomalyStats,
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
  logger,
  environment,
}: {
  setup: Setup & SetupTimeRange;
  logger: Logger;
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
  const params = {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { result_type: 'record' } },
            { terms: { job_id: mlJobIds } },
            {
              range: {
                timestamp: { gte: start, lte: end, format: 'epoch_millis' },
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
                _source: { includes: ['actual', 'job_id', 'by_field_value'] },
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

function transformResponseToServiceAnomalies(
  response: ServiceAnomaliesAggResponse
): Record<string, ServiceAnomalyStats> {
  const serviceAnomaliesMap = response.aggregations.services.buckets.reduce(
    (statsByServiceName, { key: serviceName, top_score: topScoreAgg }) => {
      return {
        ...statsByServiceName,
        [serviceName]: {
          transactionType: topScoreAgg.hits.hits[0]?._source?.by_field_value,
          anomalyScore: topScoreAgg.hits.hits[0]?.sort?.[0],
          actualValue: topScoreAgg.hits.hits[0]?._source?.actual?.[0],
          jobId: topScoreAgg.hits.hits[0]?._source?.job_id,
        },
      };
    },
    {}
  );
  return serviceAnomaliesMap;
}

export async function getMLJobIds(
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
      throw new Error(`ML job Not Found for environment "${environment}".`);
    }
    return [matchingMLJob.job_id];
  }
  return mlJobs.map((job) => job.job_id);
}
