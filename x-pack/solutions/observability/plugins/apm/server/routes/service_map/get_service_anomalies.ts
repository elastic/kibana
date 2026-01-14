/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { sortBy, uniqBy } from 'lodash';
import type { estypes } from '@elastic/elasticsearch';
import type { MlAnomalyDetectors } from '@kbn/ml-plugin/server';
import { rangeQuery, wildcardQuery } from '@kbn/observability-plugin/server';
import { getSeverity, ML_ERRORS } from '../../../common/anomaly_detection';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getServiceHealthStatus } from '../../../common/service_health_status';
import { defaultTransactionTypes } from '../../../common/transaction_types';
import { withApmSpan } from '../../utils/with_apm_span';
import { getMlJobsWithAPMGroup } from '../../lib/anomaly_detection/get_ml_jobs_with_apm_group';
import type { MlClient } from '../../lib/helpers/get_ml_client';
import { apmMlAnomalyQuery } from '../../lib/anomaly_detection/apm_ml_anomaly_query';
import { AnomalyDetectorType } from '../../../common/anomaly_detection/apm_ml_detectors';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  anomalySearch,
  ML_SERVICE_NAME_FIELD,
  ML_TRANSACTION_TYPE_FIELD,
} from '../../lib/anomaly_detection/anomaly_search';

export const DEFAULT_ANOMALIES: ServiceAnomaliesResponse = {
  mlJobIds: [],
  serviceAnomalies: [],
};

export type ServiceAnomaliesResponse = Awaited<ReturnType<typeof getServiceAnomalies>>;
export async function getServiceAnomalies({
  mlClient,
  environment,
  start,
  end,
  searchQuery,
}: {
  mlClient?: MlClient;
  environment: string;
  start: number;
  end: number;
  searchQuery?: string;
}) {
  return withApmSpan('get_service_anomalies', async () => {
    if (!mlClient) {
      throw Boom.notImplemented(ML_ERRORS.ML_NOT_AVAILABLE);
    }

    const params = {
      size: 0,
      query: {
        bool: {
          filter: [
            ...apmMlAnomalyQuery({
              detectorTypes: [AnomalyDetectorType.txLatency],
            }),
            ...rangeQuery(Math.min(end - 30 * 60 * 1000, start), end, 'timestamp'),
            {
              terms: {
                // Only retrieving anomalies for default transaction types
                by_field_value: defaultTransactionTypes,
              },
            },
            ...wildcardQuery(ML_SERVICE_NAME_FIELD, searchQuery),
          ] as estypes.QueryDslQueryContainer[],
        },
      },
      aggs: {
        services: {
          composite: {
            size: 5000,
            sources: [
              { serviceName: { terms: { field: ML_SERVICE_NAME_FIELD } } },
              { jobId: { terms: { field: 'job_id' } } },
            ] as Array<Record<string, estypes.AggregationsCompositeAggregationSource>>,
          },
          aggs: {
            record_results: {
              filter: {
                term: {
                  result_type: 'record',
                },
              },
              aggs: {
                metrics: {
                  top_metrics: {
                    metrics: asMutableArray([
                      { field: 'actual' },
                      { field: ML_TRANSACTION_TYPE_FIELD },
                      { field: 'record_score' },
                    ] as const),
                    size: 1,
                    sort: {
                      record_score: 'desc' as const,
                    },
                  },
                },
              },
            },
            // fallback to model_plot if no records are found
            model_plot_results: {
              filter: {
                term: {
                  result_type: 'model_plot',
                },
              },
              aggs: {
                metrics: {
                  top_metrics: {
                    metrics: asMutableArray([
                      { field: 'actual' },
                      { field: ML_TRANSACTION_TYPE_FIELD },
                    ] as const),
                    size: 1,
                    sort: {
                      timestamp: 'desc' as const,
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const [anomalyResponse, jobIds] = await Promise.all([
      withApmSpan('ml_anomaly_search', () =>
        anomalySearch(mlClient.mlSystem.mlAnomalySearch, params)
      ),
      getMLJobIds(mlClient.anomalyDetectors, environment),
    ]);

    const relevantBuckets = uniqBy(
      sortBy(
        // make sure we only return data for jobs that are available in this space
        anomalyResponse.aggregations?.services.buckets.filter((bucket) =>
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
        const recordMetrics = bucket.record_results.metrics.top[0]?.metrics;
        const modelPlotMetrics = bucket.model_plot_results.metrics.top[0]?.metrics;

        // Anomaly score always comes from records, 0 if no records
        const anomalyScore = recordMetrics?.record_score
          ? (recordMetrics.record_score as number)
          : 0;

        const severity = getSeverity(anomalyScore);
        const healthStatus = getServiceHealthStatus({ severity });

        return {
          serviceName: bucket.key.serviceName as string,
          jobId: bucket.key.jobId as string,
          // Prefer record metrics, fallback to model_plot for context values
          transactionType: (recordMetrics?.by_field_value ||
            modelPlotMetrics?.by_field_value) as string,
          actualValue: (recordMetrics?.actual || modelPlotMetrics?.actual) as number,
          anomalyScore,
          healthStatus,
        };
      }),
    };
  });
}

export async function getMLJobs(anomalyDetectors: MlAnomalyDetectors, environment?: string) {
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

export async function getMLJobIds(anomalyDetectors: MlAnomalyDetectors, environment?: string) {
  const mlJobs = await getMLJobs(anomalyDetectors, environment);
  return mlJobs.map((job) => job.jobId);
}
