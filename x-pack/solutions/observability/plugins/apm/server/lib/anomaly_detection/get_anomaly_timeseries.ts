/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { compact, keyBy } from 'lodash';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { parseInterval } from '@kbn/data-plugin/common';
import type { Environment } from '../../../common/environment_rt';
import { apmMlAnomalyQuery } from './apm_ml_anomaly_query';
import {
  AnomalyDetectorType,
  getAnomalyDetectorType,
} from '../../../common/anomaly_detection/apm_ml_detectors';
import type { ServiceAnomalyTimeseries } from '../../../common/anomaly_detection/service_anomaly_timeseries';
import { apmMlJobsQuery } from './apm_ml_jobs_query';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { maybe } from '../../../common/utils/maybe';
import type { MlClient } from '../helpers/get_ml_client';
import { anomalySearch } from './anomaly_search';
import { getAnomalyResultBucketSize } from './get_anomaly_result_bucket_size';
import { getMlJobsWithAPMGroup } from './get_ml_jobs_with_apm_group';

const FALLBACK_ML_BUCKET_SPAN = 15; // minutes

function divide(value: number | null, divider: number) {
  if (value === null) {
    return null;
  }
  return value / divider;
}

// Expected bounds are retrieved with bucket span interval padded to the time range
// so we need to cut the excess bounds to just the start and end time
// so that the chart show up correctly without the padded time
function getBoundedX(value: number | null, start: number, end: number) {
  if (value === null) {
    return null;
  }
  if (value < start) return start;
  if (value > end) return end;
  return value;
}

export async function getAnomalyTimeseries({
  serviceName,
  transactionType,
  start,
  end,
  logger,
  mlClient,
  environment: preferredEnvironment,
}: {
  serviceName: string;
  transactionType: string;
  start: number;
  end: number;
  environment: Environment;
  logger: Logger;
  mlClient: MlClient;
}): Promise<ServiceAnomalyTimeseries[]> {
  if (!mlClient) {
    return [];
  }

  const mlJobs = await getMlJobsWithAPMGroup(mlClient.anomalyDetectors);

  if (!mlJobs.length) {
    return [];
  }

  // If multiple ML jobs exist
  // find the first job with valid running datafeed that matches the preferred environment
  const preferredBucketSpan = mlJobs.find(
    (j) => j.datafeedState !== undefined && j.environment === preferredEnvironment
  )?.bucketSpan;

  const minBucketSize =
    parseInterval(preferredBucketSpan ?? `${FALLBACK_ML_BUCKET_SPAN}m`)?.asSeconds() ??
    FALLBACK_ML_BUCKET_SPAN * 60; // secs

  // Expected bounds (aka ML model plots) are stored as points in time, in intervals of the predefined bucket_span,
  // so to query bounds that include start and end time
  // we need to append bucket size before and after the range
  const extendedStart = start - minBucketSize * 1000; // ms
  const extendedEnd = end + minBucketSize * 1000; // ms

  const { intervalString } = getAnomalyResultBucketSize({
    start: extendedStart,
    end: extendedEnd,
    // If the calculated bucketSize is smaller than the bucket span interval,
    // use the original job's bucket_span
    minBucketSize,
  });
  const anomaliesResponse = await anomalySearch(mlClient.mlSystem.mlAnomalySearch, {
    size: 0,
    query: {
      bool: {
        filter: [
          ...apmMlAnomalyQuery({
            serviceName,
            transactionType,
          }),
          ...rangeQuery(extendedStart, extendedEnd, 'timestamp'),
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
                min: extendedStart,
                max: extendedEnd,
              },
            },
            aggs: {
              record_results: {
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
      },
    },
  });

  const jobsById = keyBy(mlJobs, (job) => job.jobId);

  const series: Array<ServiceAnomalyTimeseries | undefined> =
    anomaliesResponse.aggregations?.by_timeseries_id.buckets.map((bucket) => {
      const jobId = bucket.key.jobId as string;
      const job = maybe(jobsById[jobId]);

      if (!job) {
        logger.debug(`Could not find job for id ${jobId}`);
        return undefined;
      }

      const type = getAnomalyDetectorType(Number(bucket.key.detectorIndex));

      // ml failure rate is stored as 0-100, we calculate failure rate as 0-1
      const divider = type === AnomalyDetectorType.txFailureRate ? 100 : 1;

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
            (dateBucket.record_results.top_anomaly.top[0]?.metrics.record_score as
              | number
              | null
              | undefined) ?? null,
          actual: divide(
            (dateBucket.record_results.top_anomaly.top[0]?.metrics.actual as
              | number
              | null
              | undefined) ?? null,
            divider
          ),
        })),
        bounds: bucket.timeseries.buckets.map((dateBucket) => {
          return {
            x: getBoundedX(dateBucket.key, start, end) as number,
            y0: divide(dateBucket.model_lower.value, divider),
            y1: divide(dateBucket.model_upper.value, divider),
          };
        }),
      };
    }) ?? [];

  return compact(series);
}
