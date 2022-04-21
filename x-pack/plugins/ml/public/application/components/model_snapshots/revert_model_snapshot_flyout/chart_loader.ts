/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlResultsService } from '../../../services/results_service';
import { CombinedJobWithStats } from '../../../../../common/types/anomaly_detection_jobs';
import { getSeverityType } from '../../../../../common/util/anomaly_utils';
import { Anomaly } from '../../../jobs/new_job/common/results_loader/results_loader';
import { LineChartPoint } from '../../../jobs/new_job/common/chart_loader/chart_loader';

export function chartLoaderProvider(mlResultsService: MlResultsService) {
  async function loadEventRateForJob(
    job: CombinedJobWithStats,
    bucketSpanMs: number,
    bars: number
  ): Promise<LineChartPoint[]> {
    const intervalMs = Math.max(
      Math.floor(
        (job.data_counts.latest_record_timestamp! - job.data_counts.earliest_record_timestamp!) /
          bars
      ),
      bucketSpanMs
    );
    const resp = await mlResultsService.getEventRateData(
      job.datafeed_config.indices.join(),
      job.datafeed_config.query,
      job.data_description.time_field!,
      job.data_counts.earliest_record_timestamp!,
      job.data_counts.latest_record_timestamp!,
      intervalMs,
      job.datafeed_config.runtime_mappings,
      job.datafeed_config.indices_options
    );
    if (resp.error !== undefined) {
      throw resp.error;
    }

    const events = Object.entries(resp.results).map(([time, value]) => ({
      time: +time,
      value: value as number,
    }));

    if (events.length) {
      // add one extra bucket with a value of 0
      // so that an extra blank bar gets drawn at the end of the chart
      // this solves an issue with elastic charts where the rect annotation
      // never covers the last bar.
      events.push({ time: events[events.length - 1].time + intervalMs, value: 0 });
    }

    return events;
  }

  async function loadAnomalyDataForJob(
    job: CombinedJobWithStats,
    bucketSpanMs: number,
    bars: number
  ) {
    const intervalMs = Math.max(
      Math.floor(
        (job.data_counts.latest_record_timestamp! - job.data_counts.earliest_record_timestamp!) /
          bars
      ),
      bucketSpanMs
    );

    const resp = await mlResultsService.getScoresByBucket(
      [job.job_id],
      job.data_counts.earliest_record_timestamp!,
      job.data_counts.latest_record_timestamp!,
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

  return { loadEventRateForJob, loadAnomalyDataForJob };
}
