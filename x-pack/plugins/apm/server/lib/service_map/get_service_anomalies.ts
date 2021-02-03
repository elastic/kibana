/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from '@hapi/boom';
import { sortBy, uniqBy } from 'lodash';
import { ESSearchResponse } from '../../../../../typings/elasticsearch';
import { MlPluginSetup } from '../../../../ml/server';
import { PromiseReturnType } from '../../../../observability/typings/common';
import { getSeverity, ML_ERRORS } from '../../../common/anomaly_detection';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getServiceHealthStatus } from '../../../common/service_health_status';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../common/transaction_types';
import { getMlJobsWithAPMGroup } from '../anomaly_detection/get_ml_jobs_with_apm_group';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

export const DEFAULT_ANOMALIES: ServiceAnomaliesResponse = {
  mlJobIds: [],
  serviceAnomalies: [],
};

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

  const params = {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { terms: { result_type: ['model_plot', 'record'] } },
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
          composite: {
            size: 5000,
            sources: [
              { serviceName: { terms: { field: 'partition_field_value' } } },
              { jobId: { terms: { field: 'job_id' } } },
            ],
          },
          aggs: {
            metrics: {
              top_metrics: {
                metrics: [
                  { field: 'actual' },
                  { field: 'by_field_value' },
                  { field: 'result_type' },
                  { field: 'record_score' },
                ] as const,
                sort: {
                  record_score: 'desc' as const,
                },
              },
            },
          },
        },
      },
    },
  };

  const [anomalyResponse, jobIds] = await Promise.all([
    // pass an empty array of job ids to anomaly search
    // so any validation is skipped
    ml.mlSystem.mlAnomalySearch(params, []),
    getMLJobIds(ml.anomalyDetectors, environment),
  ]);

  const typedAnomalyResponse: ESSearchResponse<
    unknown,
    typeof params
  > = anomalyResponse as any;
  const relevantBuckets = uniqBy(
    sortBy(
      // make sure we only return data for jobs that are available in this space
      typedAnomalyResponse.aggregations?.services.buckets.filter((bucket) =>
        jobIds.includes(bucket.key.jobId as string)
      ) ?? [],
      // sort by job ID in case there are multiple jobs for one service to
      // ensure consistent results
      (bucket) => bucket.key.jobId
    ),
    // return one bucket per service
    (bucket) => bucket.key.serviceName
  );

  return {
    mlJobIds: jobIds,
    serviceAnomalies: relevantBuckets.map((bucket) => {
      const metrics = bucket.metrics.top[0].metrics;

      const anomalyScore =
        metrics.result_type === 'record' && metrics.record_score
          ? (metrics.record_score as number)
          : 0;

      const severity = getSeverity(anomalyScore);
      const healthStatus = getServiceHealthStatus({ severity });

      return {
        serviceName: bucket.key.serviceName as string,
        jobId: bucket.key.jobId as string,
        transactionType: metrics.by_field_value as string,
        actualValue: metrics.actual as number | null,
        anomalyScore,
        healthStatus,
      };
    }),
  };
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
