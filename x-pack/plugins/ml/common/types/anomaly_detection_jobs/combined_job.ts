/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datafeed } from './datafeed';
import type { DatafeedStats } from './datafeed_stats';
import type { Job } from './job';
import type { JobStats } from './job_stats';
import type { JobAlertingRuleStats } from '../alerts';

export type JobWithStats = Job & JobStats & JobAlertingRuleStats;
export type DatafeedWithStats = Datafeed & DatafeedStats;

// in older implementations of the job config, the datafeed was placed inside the job
// for convenience.
export interface CombinedJob extends Job {
  calendars?: string[];
  datafeed_config: Datafeed;
}

export interface CombinedJobWithStats extends JobWithStats {
  calendars?: string[];
  datafeed_config: DatafeedWithStats;
}

export function isCombinedJobWithStats(arg: any): arg is CombinedJobWithStats {
  return typeof arg.job_id === 'string';
}
