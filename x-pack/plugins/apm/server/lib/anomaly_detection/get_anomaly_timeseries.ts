/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { compact, keyBy } from 'lodash';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { apmMlAnomalyQuery } from './apm_ml_anomaly_query';
import {
  ApmMlDetectorType,
  getApmMlDetectorType,
} from '../../../common/anomaly_detection/apm_ml_detectors';
import type { ServiceAnomalyTimeseries } from '../../../common/anomaly_detection/service_anomaly_timeseries';
import { apmMlJobsQuery } from './apm_ml_jobs_query';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { maybe } from '../../../common/utils/maybe';
import type { Setup } from '../helpers/setup_request';
import { anomalySearch } from './anomaly_search';
import { getAnomalyResultBucketSize } from './get_anomaly_result_bucket_size';
import { getMlJobsWithAPMGroup } from './get_ml_jobs_with_apm_group';

export async function getAnomalyTimeseries({
  serviceName,
  transactionType,
  start,
  end,
  logger,
  mlSetup,
}: {
  serviceName: string;
  transactionType: string;
  start: number;
  end: number;
  logger: Logger;
  mlSetup: Required<Setup>['ml'];
}): Promise<ServiceAnomalyTimeseries[]> {
  if (!mlSetup) {
    return [];
  }

  const { intervalString } = getAnomalyResultBucketSize({
    start,
    end,
  });

  const mlJobs = await getMlJobsWithAPMGroup(mlSetup.anomalyDetectors);

  if (!mlJobs.length) {
    return [];
  }

  const anomaliesResponse = await anomalySearch(
    mlSetup.mlSystem.mlAnomalySearch,
    {
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...apmMlAnomalyQuery({
                serviceName,
                transactionType,
              }),
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
              timeseries: {
                date_histogram: {
                  field: 'timestamp',
                  fixed_interval: intervalString,
                  extended_bounds: {
                    min: start,
                    max: end,
                  },
                },
                aggs: {
                  top_anomaly: {
                    top_metrics: {
                      metrics: asMutableArray([
                        { field: 'record_score' },
                        { field: 'actual' },
                      ] as const),
                      size: 1,
                      sort: {
                        record_score: 'desc',
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
          },
        },
      },
    }
  );

  const jobsById = keyBy(mlJobs, (job) => job.jobId);

  function divide(value: number | null, divider: number) {
    if (value === null) {
      return null;
    }
    return value / divider;
  }

  const series: Array<ServiceAnomalyTimeseries | undefined> =
    anomaliesResponse.aggregations?.by_timeseries_id.buckets.map((bucket) => {
      const jobId = bucket.key.jobId as string;
      const job = maybe(jobsById[jobId]);

      if (!job) {
        logger.warn(`Could not find job for id ${jobId}`);
        return undefined;
      }

      const type = getApmMlDetectorType(Number(bucket.key.detectorIndex));

      // ml failure rate is stored as 0-100, we calculate failure rate as 0-1
      const divider = type === ApmMlDetectorType.txFailureRate ? 100 : 1;

      return {
        jobId,
        type,
        serviceName: bucket.key.serviceName as string,
        environment: job.environment,
        transactionType: bucket.key.transactionType as string,
        version: job.version,
        anomalies: bucket.timeseries.buckets.map((dateBucket) => ({
          x: dateBucket.key as number,
          y:
            (dateBucket.top_anomaly.top[0]?.metrics.record_score as
              | number
              | null
              | undefined) ?? null,
          actual: divide(
            (dateBucket.top_anomaly.top[0]?.metrics.actual as
              | number
              | null
              | undefined) ?? null,
            divider
          ),
        })),
        bounds: bucket.timeseries.buckets.map((dateBucket) => ({
          x: dateBucket.key as number,
          y0: divide(dateBucket.model_lower.value, divider),
          y1: divide(dateBucket.model_upper.value, divider),
        })),
      };
    }) ?? [];

  return compact(series);
}
