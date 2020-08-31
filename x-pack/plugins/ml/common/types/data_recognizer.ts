/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface JobStat {
  id: string;
  earliestTimestampMs: number;
  latestTimestampMs: number;
  latestResultsTimestampMs: number | undefined;
}

export interface JobExistResult {
  jobsExist: boolean;
  jobs: JobStat[];
}
