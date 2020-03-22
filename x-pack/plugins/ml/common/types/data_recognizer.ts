/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CombinedJobWithStats } from './anomaly_detection_jobs';
import { DatafeedResponse, JobResponse, KibanaObjectResponse } from './modules';

export interface RawModuleConfig {
  id: string;
  title: string;
  description: string;
  type: string;
  logoFile: string;
  defaultIndexPattern: string;
  query: any;
  jobs: Array<{ file: string; id: string }>;
  datafeeds: Array<{ file: string; job_id: string; id: string }>;
  kibana: {
    search: Array<{ file: string; id: string }>;
    visualization: Array<{ file: string; id: string }>;
    dashboard: Array<{ file: string; id: string }>;
  };
}

export interface MlJobStats {
  jobs: CombinedJobWithStats[];
}

export interface Config {
  dirName: any;
  json: RawModuleConfig;
}

export interface RecognizeResult {
  id: string;
  title: string;
  query: any;
  description: string;
  logo: { icon: string } | null;
}

export interface ObjectExistResult {
  id: string;
  type: string;
}

export interface ObjectExistResponse {
  id: string;
  type: string;
  exists: boolean;
  savedObject?: any;
}

export interface SaveResults {
  jobs: JobResponse[];
  datafeeds: DatafeedResponse[];
  savedObjects: KibanaObjectResponse[];
}

export interface JobStat {
  id: string;
  earliestTimestampMs: number;
  latestTimestampMs: number;
  latestResultsTimestampMs: number;
}

export interface JobExistResult {
  jobsExist: boolean;
  jobs: JobStat[];
}
