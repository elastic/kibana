/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { compact, keyBy } from 'lodash';
import {
  ApmMlDetectorType,
  getApmMlDetectorType,
} from '../../../common/anomaly_detection/apm_ml_detectors';
import {
  ApmMlJobResult,
  ApmMlJobResultWithTimeseries,
} from '../../../common/anomaly_detection/apm_ml_job_result';
import { ApmMlModule } from '../../../common/anomaly_detection/apm_ml_module';
import { getMlBucketSizeInSeconds } from '../../../common/anomaly_detection/get_ml_bucket_size_in_seconds';
import { Environment } from '../../../common/environment_rt';
import { getBucketSize } from '../../../common/utils/get_bucket_size';
import { isFiniteNumber } from '../../../common/utils/is_finite_number';
import { getMLJobs } from '../../routes/service_map/get_service_anomalies';
import type { MlClient } from '../helpers/get_ml_client';
import { anomalySearch } from './anomaly_search';
import { apmMlAnomalyQuery } from './apm_ml_anomaly_query';
import { apmMlJobsQuery } from './apm_ml_jobs_query';
import { getAnomalyAggregation } from './get_anomaly_aggregation';

// Expected bounds are retrieved with bucket span interval padded to the time range
// so we need to cut the excess bounds to just the start and end time
// so that the chart show up correctly without the padded time
function getBoundedX(value: number, start: number, end: number) {
  if (value < start) return start;
  if (value > end) return end;
  return value;
}

export async function getAnomalyResults<
  TBucketSize extends number | null | 'auto'
>({
  partition,
  by,
  start,
  end,
  mlClient,
  environment,
  module,
  bucketSizeInSeconds,
}: {
  partition?: string | string[];
  by?: string | string[];
  start: number;
  end: number;
  environment: Environment;
  mlClient: MlClient;
  module?: ApmMlModule;
  bucketSizeInSeconds: TBucketSize;
}): Promise<
  TBucketSize extends number | string
    ? ApmMlJobResultWithTimeseries[]
    : ApmMlJobResult[]
> {
  let mlJobs = await getMLJobs(mlClient.anomalyDetectors, environment);

  if (!mlJobs.length) {
    return [];
  }

  if (module) {
    mlJobs = mlJobs.filter((job) => job.module === module);
  }

  const minBucketSize = getMlBucketSizeInSeconds({ jobs: mlJobs });

  let calculatedBucketSizeInSeconds: number | null = null;

  if (bucketSizeInSeconds === 'auto') {
    calculatedBucketSizeInSeconds = getBucketSize({
      start,
      end,
      minBucketSize,
    }).bucketSize;
  } else if (typeof bucketSizeInSeconds === 'number') {
    calculatedBucketSizeInSeconds = Math.max(
      minBucketSize,
      bucketSizeInSeconds
    );
  }

  // Expected bounds (aka ML model plots) are stored as points in time, in intervals of the predefined bucket_span,
  // so to query bounds that include start and end time
  // we need to append bucket size before and after the range
  const extendedStart = isFiniteNumber(calculatedBucketSizeInSeconds)
    ? start - calculatedBucketSizeInSeconds * 1000
    : start; // ms
  const extendedEnd = isFiniteNumber(calculatedBucketSizeInSeconds)
    ? end + calculatedBucketSizeInSeconds * 1000
    : end; // ms

  const anomaliesResponse = await anomalySearch(
    mlClient.mlSystem.mlAnomalySearch,
    {
      body: {
        size: 0,
        track_total_hits: false,
        query: {
          bool: {
            filter: [
              ...apmMlAnomalyQuery({
                partition,
                by,
              }),
              ...rangeQuery(extendedStart, extendedEnd, 'timestamp'),
              ...apmMlJobsQuery(mlJobs),
            ],
          },
        },
        aggs: getAnomalyAggregation<number | null>({
          start,
          end,
          bucketSizeInSeconds: calculatedBucketSizeInSeconds,
        }),
      },
    }
  );

  const jobsById = keyBy(mlJobs, (job) => job.jobId);

  const series: ApmMlJobResult[] | ApmMlJobResultWithTimeseries[] =
    anomaliesResponse.aggregations?.by_service.buckets.map((bucket) => {
      const jobId = bucket.key.jobId as string;
      const job = jobsById[jobId];

      const type = getApmMlDetectorType({
        detectorIndex: Number(bucket.key.detectorIndex),
        module: job.module,
      });

      const normalize =
        type === ApmMlDetectorType.serviceDestinationFailureRate ||
        type === ApmMlDetectorType.txFailureRate
          ? (value: number | null) => {
              if (value === null) {
                return value;
              }

              return value / 100;
            }
          : (value: number | null) => value;

      return {
        partition: bucket.key.partition as string,
        by: bucket.key.by as string,
        job,
        type,
        anomalies: {
          actual: bucket.record.actual.value || null,
          max: bucket.record.record_score.value ?? 0,
          ...('timeseries' in bucket.record
            ? {
                timeseries:
                  bucket.record.timeseries?.buckets.map((recordBucket) => ({
                    x: recordBucket.key,
                    y:
                      ('record_score' in recordBucket
                        ? recordBucket.record_score.value
                        : null) ?? 0,
                    actual:
                      'actual' in recordBucket
                        ? normalize(recordBucket.actual.value)
                        : null,
                  })) ?? [],
              }
            : {}),
        },
        bounds: {
          min: normalize(bucket.model_plot.model_lower.value),
          max: normalize(bucket.model_plot.model_upper.value),
          ...('timeseries' in bucket.model_plot
            ? {
                timeseries:
                  bucket.model_plot.timeseries?.buckets.map(
                    (modelPlotBucket) => ({
                      x: getBoundedX(modelPlotBucket.key, start, end),
                      ...('model_lower' in modelPlotBucket &&
                      'model_upper' in modelPlotBucket
                        ? {
                            y0: normalize(modelPlotBucket.model_lower.value),
                            y1: normalize(modelPlotBucket.model_upper.value),
                          }
                        : { y0: null, y1: null }),
                    })
                  ) ?? [],
              }
            : {}),
        },
      };
    }) ?? [];

  return compact(series) as TBucketSize extends number | string
    ? ApmMlJobResultWithTimeseries[]
    : ApmMlJobResult[];
}
