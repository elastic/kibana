/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Job, JobStats } from './anomaly_detection_jobs';

export interface MlJobsResponse {
  jobs: Job[];
  count: number;
}

export interface MlJobsStatsResponse {
  jobs: JobStats[];
  count: number;
}

export interface JobsExistResponse {
  [jobId: string]: {
    exists: boolean;
    isGroup: boolean;
  };
}
