/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ES_AGGREGATION } from '@kbn/ml-anomaly-utils';
import type { ErrorType } from '@kbn/ml-error-utils';
import { type RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { Job, JobStats, IndicesOptions } from './anomaly_detection_jobs';

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
  query?: any;
  splitField?: string;
  timeField?: string;
  runtimeMappings?: RuntimeMappings;
  indicesOptions?: IndicesOptions;
}

export interface BulkCreateResults {
  [id: string]: {
    job: { success: boolean; error?: ErrorType };
    datafeed: { success: boolean; error?: ErrorType };
  };
}

export interface ResetJobsResponse {
  [jobId: string]: {
    reset: boolean;
    task?: string;
    error?: ErrorType;
  };
}

export interface UpdateGroupsRequest {
  jobs: Array<{ jobId: string; groups: string[] }>;
}
