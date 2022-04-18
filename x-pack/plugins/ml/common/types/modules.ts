/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectAttributes } from '@kbn/core/public';
import { Datafeed, Job } from './anomaly_detection_jobs';
import { ErrorType } from '../util/errors';

export interface ModuleJob {
  id: string;
  config: Omit<Job, 'job_id'>;
}

export interface ModuleDatafeed {
  id: string;
  job_id: string;
  config: Omit<Datafeed, 'datafeed_id'>;
}

export interface KibanaObjectConfig extends SavedObjectAttributes {
  description: string;
  title: string;
  version: number;
  kibanaSavedObjectMeta?: {
    searchSourceJSON: string;
  };
}

export interface KibanaObject {
  id: string;
  title: string;
  config: KibanaObjectConfig;
  exists?: boolean;
  error?: any;
}

export interface KibanaObjects {
  [objectType: string]: KibanaObject[] | undefined;
}

/**
 * Interface for get_module endpoint response.
 */
export interface Module {
  id: string;
  title: string;
  description: string;
  type: string;
  logoFile?: string;
  logo?: Logo;
  defaultIndexPattern: string;
  query: any;
  jobs: ModuleJob[];
  datafeeds: ModuleDatafeed[];
  kibana: KibanaObjects;
}

export interface FileBasedModule extends Omit<Module, 'jobs' | 'datafeeds' | 'kibana'> {
  jobs: Array<{ file: string; id: string }>;
  datafeeds: Array<{ file: string; job_id: string; id: string }>;
  kibana: {
    search: Array<{ file: string; id: string }>;
    visualization: Array<{ file: string; id: string }>;
    dashboard: Array<{ file: string; id: string }>;
  };
}

export type Logo = { icon: string } | null;

export interface ResultItem {
  id: string;
  success?: boolean;
}

export interface KibanaObjectResponse extends ResultItem {
  exists?: boolean;
  error?: any;
}

export interface DatafeedResponse extends ResultItem {
  started: boolean;
  awaitingMlNodeAllocation?: boolean;
  error?: ErrorType;
}

export interface JobResponse extends ResultItem {
  error?: ErrorType;
}

export interface DataRecognizerConfigResponse {
  datafeeds: DatafeedResponse[];
  jobs: JobResponse[];
  kibana: {
    search: KibanaObjectResponse[];
    visualization: KibanaObjectResponse[];
    dashboard: KibanaObjectResponse[];
  };
}

export type JobOverride = Partial<Job>;
export type GeneralJobsOverride = Omit<JobOverride, 'job_id'>;
export type JobSpecificOverride = JobOverride & { job_id: Job['job_id'] };

export function isGeneralJobOverride(override: JobOverride): override is GeneralJobsOverride {
  return override.job_id === undefined;
}

export type GeneralDatafeedsOverride = Partial<Omit<Datafeed, 'job_id' | 'datafeed_id'>>;

export type DatafeedOverride = Partial<Datafeed>;
