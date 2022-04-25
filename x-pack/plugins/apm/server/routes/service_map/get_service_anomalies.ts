/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { sortBy, uniqBy } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ESSearchResponse } from '@kbn/core/types/elasticsearch';
import { MlPluginSetup } from '@kbn/ml-plugin/server';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { getSeverity, ML_ERRORS } from '../../../common/anomaly_detection';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getServiceHealthStatus } from '../../../common/service_health_status';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../common/transaction_types';
import { withApmSpan } from '../../utils/with_apm_span';
import { getMlJobsWithAPMGroup } from '../../lib/anomaly_detection/get_ml_jobs_with_apm_group';
import { Setup } from '../../lib/helpers/setup_request';
import { apmMlAnomalyQuery } from '../../lib/anomaly_detection/apm_ml_anomaly_query';
import { ApmMlDetectorType } from '../../../common/anomaly_detection/apm_ml_detectors';

export const DEFAULT_ANOMALIES: ServiceAnomaliesResponse = {
  mlJobIds: [],
  serviceAnomalies: [],
};

export type ServiceAnomaliesResponse = Awaited<
  ReturnType<typeof getServiceAnomalies>
>;
export async function getServiceAnomalies({
  setup,
  environment,
  start,
  end,
}: {
  setup: Setup;
  environment: string;
  start: number;
  end: number;
}) {
  return withApmSpan('get_service_anomalies', async () => {
    const { ml } = setup;

    if (!ml) {
      throw Boom.notImplemented(ML_ERRORS.ML_NOT_AVAILABLE);
    }

    const params = {
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...apmMlAnomalyQuery({
                detectorTypes: [ApmMlDetectorType.txLatency],
              }),
              ...rangeQuery(
                Math.min(end - 30 * 60 * 1000, start),
                end,
                'timestamp'
              ),
              {
                terms: {
                  // Only retrieving anomalies for transaction types "request" and "page-load"
                  by_field_value: [TRANSACTION_REQUEST, TRANSACTION_PAGE_LOAD],
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
                    { field: 'actual' },
                    { field: 'by_field_value' },
                    { field: 'result_type' },
                    { field: 'record_score' },
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
        ml.mlSystem.mlAnomalySearch(params, [])
      ),
      getMLJobIds(ml.anomalyDetectors, environment),
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
  });
}

export async function getMLJobs(
  anomalyDetectors: ReturnType<MlPluginSetup['anomalyDetectorsProvider']>,
  environment: string
) {
  const jobs = await getMlJobsWithAPMGroup(anomalyDetectors);

  // to filter out legacy jobs we are filtering by the existence of `apm_ml_version` in `custom_settings`
  // and checking that it is compatable.
  const mlJobs = jobs.filter((job) => job.version >= 2);
  if (environment !== ENVIRONMENT_ALL.value) {
    const matchingMLJob = mlJobs.find((job) => job.environment === environment);
    if (!matchingMLJob) {
      return [];
    }
    return [matchingMLJob];
  }
  return mlJobs;
}

export async function getMLJobIds(
  anomalyDetectors: ReturnType<MlPluginSetup['anomalyDetectorsProvider']>,
  environment: string
) {
  const mlJobs = await getMLJobs(anomalyDetectors, environment);
  return mlJobs.map((job) => job.jobId);
}
