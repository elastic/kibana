/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { TimeRange } from 'src/plugins/data/common/query/timefilter/types';
import { CombinedJob, Datafeed } from '../../../common/types/anomaly_detection_jobs';
import { Calendar } from '../../../common/types/calendars';

export interface ExistingJobsAndGroups {
  jobIds: string[];
  groupIds: string[];
}

declare interface JobService {
  jobs: CombinedJob[];
  createResultsUrlForJobs: (jobs: any[], target: string, timeRange?: TimeRange) => string;
  tempJobCloningObjects: {
    createdBy?: string;
    datafeed?: Datafeed;
    job: any;
    skipTimeRangeStep: boolean;
    start?: number;
    end?: number;
    calendars: Calendar[] | undefined;
  };
  skipTimeRangeStep: boolean;
  saveNewJob(job: any): Promise<any>;
  cloneDatafeed(datafeed: any): Datafeed;
  openJob(jobId: string): Promise<any>;
  saveNewDatafeed(datafeedConfig: any, jobId: string): Promise<any>;
  startDatafeed(
    datafeedId: string,
    jobId: string,
    start: number | undefined,
    end: number | undefined
  ): Promise<any>;
  createResultsUrl(jobId: string[], start: number, end: number, location: string): string;
  getJobAndGroupIds(): Promise<ExistingJobsAndGroups>;
  searchPreview(job: CombinedJob): Promise<SearchResponse<any>>;
  getJob(jobId: string): CombinedJob;
  loadJobsWrapper(): Promise<CombinedJob[]>;
}

export const mlJobService: JobService;
