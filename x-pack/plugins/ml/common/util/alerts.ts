/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CombinedJobWithStats, Datafeed, Job } from '../types/anomaly_detection_jobs';
import { resolveMaxTimeInterval } from './job_utils';
import { isDefined } from '../types/guards';
import { parseInterval } from './parse_interval';

const narrowBucketLength = 60;

/**
 * Resolves the lookback interval for the rule
 * using the formula max(2m, 2 * bucket_span) + query_delay + 1s.
 * and rounds up to a whole number of minutes.
 */
export function resolveLookbackInterval(jobs: Job[], datafeeds: Datafeed[]): string {
  const bucketSpanInSeconds = Math.ceil(
    resolveMaxTimeInterval(jobs.map((v) => v.analysis_config.bucket_span)) ?? 0
  );
  const queryDelayInSeconds = Math.ceil(
    resolveMaxTimeInterval(datafeeds.map((v) => v.query_delay).filter(isDefined)) ?? 0
  );

  const result =
    Math.max(2 * narrowBucketLength, 2 * bucketSpanInSeconds) + queryDelayInSeconds + 1;

  return `${Math.ceil(result / 60)}m`;
}

/**
 * @deprecated We should avoid using {@link CombinedJobWithStats}. Replace usages with {@link resolveLookbackInterval} when
 * Kibana API returns mapped job and the datafeed configs.
 */
export function getLookbackInterval(jobs: CombinedJobWithStats[]): string {
  return resolveLookbackInterval(
    jobs,
    jobs.map((v) => v.datafeed_config)
  );
}

export function getTopNBuckets(job: Job): number {
  const bucketSpan = parseInterval(job.analysis_config.bucket_span);

  if (bucketSpan === null) {
    throw new Error('Unable to resolve a bucket span length');
  }

  return Math.ceil(narrowBucketLength / bucketSpan.asSeconds());
}
