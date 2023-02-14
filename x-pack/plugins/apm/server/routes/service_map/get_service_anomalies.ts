/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import Boom from '@hapi/boom';
import type { ESSearchResponse } from '@kbn/es-types';
import type { MlAnomalyDetectors } from '@kbn/ml-plugin/server';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { compact, sortBy, uniqBy } from 'lodash';
import { getSeverity, ML_ERRORS } from '../../../common/anomaly_detection';
import {
  ApmMlDetectorType,
  getApmMlDetectorType,
} from '../../../common/anomaly_detection/apm_ml_detectors';
import { getApmMlModuleFromJob } from '../../../common/anomaly_detection/apm_ml_module';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getServiceHealthStatus } from '../../../common/service_health_status';
import { defaultTransactionTypes } from '../../../common/transaction_types';
import { getMlJobsWithAPMGroup } from '../../lib/anomaly_detection/get_ml_jobs_with_apm_group';
import { MlClient } from '../../lib/helpers/get_ml_client';
import { withApmSpan } from '../../utils/with_apm_span';

export const DEFAULT_ANOMALIES: ServiceAnomaliesResponse = {
  serviceAnomalies: [],
};

export type ServiceAnomaliesResponse = Awaited<
  ReturnType<typeof getServiceAnomalies>
>;
export async function getServiceAnomalies({
  mlClient,
  environment,
  start,
  end,
}: {
  mlClient?: MlClient;
  environment: string;
  start: number;
  end: number;
}) {
  return withApmSpan('get_service_anomalies', async () => {
    if (!mlClient) {
      throw Boom.notImplemented(ML_ERRORS.ML_NOT_AVAILABLE);
    }

    const params = {
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...rangeQuery(
                Math.min(end - 30 * 60 * 1000, start),
                end,
                'timestamp'
              ),
              {
                terms: {
                  // Only retrieving anomalies for default transaction types
                  by_field_value: defaultTransactionTypes,
                },
              },
            ] as estypes.QueryDslQueryContainer[],
          },
        },
        aggs: {
          services: {
            composite: {
              size: 5000,
              sources: [
                { serviceName: { terms: { field: 'partition_field_value' } } },
                { jobId: { terms: { field: 'job_id' } } },
              ] as Array<
                Record<string, estypes.AggregationsCompositeAggregationSource>
              >,
            },
            aggs: {
              metrics: {
                top_metrics: {
                  metrics: [
                    { field: 'actual' } as const,
                    { field: 'by_field_value' } as const,
                    { field: 'result_type' } as const,
                    { field: 'record_score' } as const,
                    { field: 'detector_index' } as const,
                  ],
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
      withApmSpan('ml_anomaly_search', () =>
        mlClient.mlSystem.mlAnomalySearch(params, [])
      ),
      getMLJobIds(mlClient.anomalyDetectors, environment),
    ]);

    const typedAnomalyResponse: ESSearchResponse<unknown, typeof params> =
      anomalyResponse as any;
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
      serviceAnomalies: compact(
        relevantBuckets.map((bucket) => {
          const metrics = bucket.metrics.top[0].metrics;

          const anomalyScore =
            metrics.result_type === 'record' && metrics.record_score
              ? (metrics.record_score as number)
              : 0;

          const severity = getSeverity(anomalyScore);
          const healthStatus = getServiceHealthStatus({ severity });

          const jobId = bucket.key.jobId as string;

          if (!jobIds.includes(jobId)) {
            return undefined;
          }

          const module = getApmMlModuleFromJob(jobId);

          const detectorType = getApmMlDetectorType({
            detectorIndex: Number(metrics.detector_index),
            module,
          });

          return detectorType === ApmMlDetectorType.txLatency
            ? {
                serviceName: bucket.key.serviceName as string,
                jobId,
                transactionType: metrics.by_field_value as string,
                actualValue: metrics.actual as number | null,
                anomalyScore,
                healthStatus,
                detectorType,
              }
            : undefined;
        })
      ),
    };
  });
}

export async function getMLJobs(
  anomalyDetectors: MlAnomalyDetectors,
  environment?: string
) {
  const jobs = await getMlJobsWithAPMGroup(anomalyDetectors);

  // to filter out legacy jobs we are filtering by the existence of `apm_ml_version` in `custom_settings`
  // and checking that it is compatable.
  const mlJobs = jobs.filter((job) => job.version >= 2);
  if (environment && environment !== ENVIRONMENT_ALL.value) {
    const matchingMLJob = mlJobs.find((job) => job.environment === environment);
    if (!matchingMLJob) {
      return [];
    }
    return [matchingMLJob];
  }
  return mlJobs;
}

export async function getMLJobIds(
  anomalyDetectors: MlAnomalyDetectors,
  environment?: string
) {
  const mlJobs = await getMLJobs(anomalyDetectors, environment);
  return mlJobs.map((job) => job.jobId);
}
