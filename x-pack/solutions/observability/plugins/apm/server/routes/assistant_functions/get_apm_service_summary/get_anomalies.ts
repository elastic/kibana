/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { compact, keyBy } from 'lodash';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import {
  AnomalyDetectorType,
  getAnomalyDetectorType,
} from '../../../../common/anomaly_detection/apm_ml_detectors';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { maybe } from '../../../../common/utils/maybe';
import { anomalySearch } from '../../../lib/anomaly_detection/anomaly_search';
import { apmMlAnomalyQuery } from '../../../lib/anomaly_detection/apm_ml_anomaly_query';
import { apmMlJobsQuery } from '../../../lib/anomaly_detection/apm_ml_jobs_query';
import { getMlJobsWithAPMGroup } from '../../../lib/anomaly_detection/get_ml_jobs_with_apm_group';
import type { MlClient } from '../../../lib/helpers/get_ml_client';

export type ApmAnomalies = Awaited<ReturnType<typeof getAnomalies>>;

export async function getAnomalies({
  serviceName,
  transactionType,
  environment,
  start,
  end,
  mlClient,
  logger,
}: {
  serviceName?: string;
  transactionType?: string;
  environment?: string;
  start: number;
  end: number;
  mlClient?: MlClient;
  logger: Logger;
}) {
  if (!mlClient) {
    return [];
  }

  const mlJobs = (await getMlJobsWithAPMGroup(mlClient.anomalyDetectors)).filter(
    (job) => job.environment === environment
  );

  if (!mlJobs.length) {
    return [];
  }

  const anomaliesResponse = await anomalySearch(mlClient.mlSystem.mlAnomalySearch, {
    size: 0,
    query: {
      bool: {
        filter: [
          ...apmMlAnomalyQuery({ serviceName, transactionType }),
          ...rangeQuery(start, end, 'timestamp'),
          ...apmMlJobsQuery(mlJobs),
        ],
      },
    },
    aggs: {
      by_timeseries_id: {
        composite: {
          size: 5000,
          sources: asMutableArray([
            {
              jobId: {
                terms: {
                  field: 'job_id',
                },
              },
            },
            {
              detectorIndex: {
                terms: {
                  field: 'detector_index',
                },
              },
            },
            {
              serviceName: {
                terms: {
                  field: 'partition_field_value',
                },
              },
            },
            {
              transactionType: {
                terms: {
                  field: 'by_field_value',
                },
              },
            },
          ] as const),
        },
        aggs: {
          record_scores: {
            filter: {
              term: {
                result_type: 'record',
              },
            },
            aggs: {
              top_anomaly: {
                top_metrics: {
                  metrics: asMutableArray([
                    { field: 'record_score' },
                    { field: 'actual' },
                    { field: 'timestamp' },
                  ] as const),
                  size: 1,
                  sort: {
                    record_score: 'desc',
                  },
                },
              },
            },
          },
          model_lower: {
            min: {
              field: 'model_lower',
            },
          },
          model_upper: {
            max: {
              field: 'model_upper',
            },
          },
        },
      },
    },
  });

  const jobsById = keyBy(mlJobs, (job) => job.jobId);

  const anomalies = anomaliesResponse.aggregations?.by_timeseries_id.buckets.map((bucket) => {
    const jobId = bucket.key.jobId as string;
    const job = maybe(jobsById[jobId]);

    if (!job) {
      logger.debug(`Could not find job for id ${jobId}`);
      return undefined;
    }

    const type = getAnomalyDetectorType(Number(bucket.key.detectorIndex));

    // ml failure rate is stored as 0-100, we calculate failure rate as 0-1
    const divider = type === AnomalyDetectorType.txFailureRate ? 100 : 1;

    const metrics = bucket.record_scores.top_anomaly.top[0]?.metrics;

    if (!metrics) {
      return undefined;
    }

    return {
      '@timestamp': new Date(metrics.timestamp as number).toISOString(),
      metricName: type.replace('tx', 'transaction'),
      [SERVICE_NAME]: bucket.key.serviceName as string,
      [SERVICE_ENVIRONMENT]: job.environment,
      [TRANSACTION_TYPE]: bucket.key.transactionType as string,
      anomalyScore: metrics.record_score,
      actualValue: Number(metrics.actual) / divider,
      expectedBoundsLower: Number(bucket.model_lower.value) / divider,
      expectedBoundsUpper: Number(bucket.model_upper.value) / divider,
    };
  });

  return compact(anomalies);
}
