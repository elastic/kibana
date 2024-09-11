/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/data-plugin/common/query/timefilter/types';
import type { CombinedJob, Datafeed, Job } from '../../../common/types/anomaly_detection_jobs';
import type { Calendar } from '../../../common/types/calendars';
import type { ToastNotificationService } from './toast_notification_service';
import type { MlApiServices } from './ml_api_service';
import type { JobCreatorType } from '../jobs/new_job/common/job_creator';

export interface ExistingJobsAndGroups {
  jobIds: string[];
  groupIds: string[];
}

export declare interface MlJobService {
  jobs: CombinedJob[];
  createResultsUrlForJobs: (jobs: any[], target: string, timeRange?: TimeRange) => string;
  tempJobCloningObjects: {
    createdBy?: string;
    datafeed?: Datafeed;
    job?: Job;
    skipTimeRangeStep: boolean;
    start?: number;
    end?: number;
    calendars: Calendar[] | undefined;
    autoSetTimeRange?: boolean;
  };
  skipTimeRangeStep: boolean;
  saveNewJob(job: Job): Promise<any>;
  cloneDatafeed(Datafeed: Datafeed): Datafeed;
  openJob(jobId: string): Promise<any>;
  saveNewDatafeed(datafeedConfig: any, jobId: string): Promise<any>;
  startDatafeed(
    datafeedId: string,
    jobId: string,
    start: number | undefined,
    end: number | undefined
  ): Promise<any>;
  forceStartDatafeeds(
    dIds: string[],
    start: number | undefined,
    end: number | undefined
  ): Promise<any>;
  createResultsUrl(jobId: string[], start: number, end: number, location: string): string;
  getJobAndGroupIds(): Promise<ExistingJobsAndGroups>;
  getJob(jobId: string): CombinedJob;
  loadJobsWrapper(): Promise<CombinedJob[]>;
  customUrlsByJob: Record<string, any[]>;
  detectorsByJob: Record<string, any>;
  stashJobForCloning(
    jobCreator: JobCreatorType,
    skipTimeRangeStep: boolean = false,
    includeTimeRange: boolean = false,
    autoSetTimeRange: boolean = false
  ): void;
}

export const mlJobServiceFactory: (
  toastNotificationService: ToastNotificationService,
  mlApiServices: MlApiServices
) => MlJobService;

export const useMlJobService: () => MlJobService;
