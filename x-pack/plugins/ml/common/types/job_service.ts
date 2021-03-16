/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Job, JobStats, IndicesOptions } from './anomaly_detection_jobs';
import { RuntimeMappings } from './fields';
import { ES_AGGREGATION } from '../constants/aggregation_types';

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

export interface BucketSpanEstimatorData {
  aggTypes: Array<ES_AGGREGATION | null>;
  duration: {
    start: number;
    end: number;
  };
  fields: Array<string | null>;
  index: string;
  query: any;
  splitField: string | undefined;
  timeField: string | undefined;
  runtimeMappings: RuntimeMappings | undefined;
  indicesOptions: IndicesOptions | undefined;
}
