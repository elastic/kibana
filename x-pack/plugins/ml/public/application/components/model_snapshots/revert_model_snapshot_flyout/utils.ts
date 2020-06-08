/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { ChartLoader } from '../../../jobs/new_job/common/chart_loader';
import { mlResultsService } from '../../../services/results_service';
import {
  // ModelSnapshot,
  CombinedJobWithStats,
} from '../../../../../common/types/anomaly_detection_jobs';
import { getSeverityType } from '../../../../../common/util/anomaly_utils';
import { Anomaly } from '../../../jobs/new_job/common/results_loader/results_loader';

export async function loadEventRateForJob(
  job: CombinedJobWithStats,
  bucketSpanMs: number,
  bars: number
) {
  const intervalMs = Math.max(
    Math.floor(
      (job.data_counts.latest_record_timestamp - job.data_counts.earliest_record_timestamp) / bars
    ),
    bucketSpanMs
  );
  const resp = await mlResultsService.getEventRateData(
    job.datafeed_config.indices.join(),
    job.datafeed_config.query,
    job.data_description.time_field,
    job.data_counts.earliest_record_timestamp,
    job.data_counts.latest_record_timestamp,
    intervalMs
  );
  if (resp.error !== undefined) {
    throw resp.error;
  }

  return Object.entries(resp.results).map(([time, value]) => ({
    time: +time,
    value: value as number,
  }));
}

export async function loadAnomalyDataForJob(
  job: CombinedJobWithStats,
  bucketSpanMs: number,
  bars: number
) {
  const intervalMs = Math.max(
    Math.floor(
      (job.data_counts.latest_record_timestamp - job.data_counts.earliest_record_timestamp) / bars
    ),
    bucketSpanMs
  );

  const resp = await mlResultsService.getScoresByBucket(
    [job.job_id],
    job.data_counts.earliest_record_timestamp,
    job.data_counts.latest_record_timestamp,
    intervalMs,
    1
  );

  const results = resp.results[job.job_id];
  if (results === undefined) {
    return [];
  }

  const anomalies: Record<number, Anomaly[]> = {};
  anomalies[0] = Object.entries(results).map(
    ([time, value]) =>
      ({ time: +time, value, severity: getSeverityType(value as number) } as Anomaly)
  );
  return anomalies;
}
