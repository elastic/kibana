/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { Datafeed } from './datafeed';
import { DatafeedStats } from './datafeed_stats';
import { Job } from './job';
import { JobStats } from './job_stats';

export type JobWithStats = Job & JobStats;
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

export function expandCombinedJobConfig(combinedJob: CombinedJob) {
  const combinedJobClone = cloneDeep(combinedJob);
  const job = combinedJobClone;
  const datafeed = combinedJobClone.datafeed_config;
  // @ts-expect-error
  delete job.datafeed_config;

  return { job, datafeed };
}

export function isCombinedJobWithStats(arg: any): arg is CombinedJobWithStats {
  return typeof arg.job_id === 'string';
}
