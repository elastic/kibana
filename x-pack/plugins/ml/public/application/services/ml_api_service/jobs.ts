/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpService } from '../http_service';

import { basePath } from './index';
import { Dictionary } from '../../../../common/types/common';
import {
  MlJobWithTimeRange,
  MlSummaryJobs,
  CombinedJobWithStats,
} from '../../../../common/types/anomaly_detection_jobs';
import { JobMessage } from '../../../../common/types/audit_message';
import { AggFieldNamePair } from '../../../../common/types/fields';
import { ExistingJobsAndGroups } from '../job_service';
import {
  CategorizationAnalyzer,
  CategoryFieldExample,
  FieldExampleCheck,
} from '../../../../common/types/categories';
import { CATEGORY_EXAMPLES_VALIDATION_STATUS } from '../../../../common/constants/categorization_job';
import { Category } from '../../../../common/types/categories';

export const jobsApiProvider = (httpService: HttpService) => ({
  jobsSummary(jobIds: string[]) {
    const body = JSON.stringify({ jobIds });
    return httpService.http<MlSummaryJobs>({
      path: `${basePath()}/jobs/jobs_summary`,
      method: 'POST',
      body,
    });
  },

  jobsWithTimerange(dateFormatTz: string) {
    const body = JSON.stringify({ dateFormatTz });
    return httpService.http<{
      jobs: MlJobWithTimeRange[];
      jobsMap: Dictionary<MlJobWithTimeRange>;
    }>({
      path: `${basePath()}/jobs/jobs_with_time_range`,
      method: 'POST',
      body,
    });
  },

  jobs(jobIds: string[]) {
    const body = JSON.stringify({ jobIds });
    return httpService.http<CombinedJobWithStats[]>({
      path: `${basePath()}/jobs/jobs`,
      method: 'POST',
      body,
    });
  },

  groups() {
    return httpService.http<any>({
      path: `${basePath()}/jobs/groups`,
      method: 'GET',
    });
  },

  updateGroups(updatedJobs: string[]) {
    const body = JSON.stringify({ jobs: updatedJobs });
    return httpService.http<any>({
      path: `${basePath()}/jobs/update_groups`,
      method: 'POST',
      body,
    });
  },

  forceStartDatafeeds(datafeedIds: string[], start: string, end: string) {
    const body = JSON.stringify({
      datafeedIds,
      start,
      end,
    });

    return httpService.http<any>({
      path: `${basePath()}/jobs/force_start_datafeeds`,
      method: 'POST',
      body,
    });
  },

  stopDatafeeds(datafeedIds: string[]) {
    const body = JSON.stringify({ datafeedIds });
    return httpService.http<any>({
      path: `${basePath()}/jobs/stop_datafeeds`,
      method: 'POST',
      body,
    });
  },

  deleteJobs(jobIds: string[]) {
    const body = JSON.stringify({ jobIds });
    return httpService.http<any>({
      path: `${basePath()}/jobs/delete_jobs`,
      method: 'POST',
      body,
    });
  },

  closeJobs(jobIds: string[]) {
    const body = JSON.stringify({ jobIds });
    return httpService.http<any>({
      path: `${basePath()}/jobs/close_jobs`,
      method: 'POST',
      body,
    });
  },

  forceStopAndCloseJob(jobId: string) {
    const body = JSON.stringify({ jobId });
    return httpService.http<{ success: boolean }>({
      path: `${basePath()}/jobs/force_stop_and_close_job`,
      method: 'POST',
      body,
    });
  },

  jobAuditMessages(jobId: string, from?: number) {
    const jobIdString = jobId !== undefined ? `/${jobId}` : '';
    const query = from !== undefined ? { from } : {};
    return httpService.http<JobMessage[]>({
      path: `${basePath()}/job_audit_messages/messages${jobIdString}`,
      method: 'GET',
      query,
    });
  },

  deletingJobTasks() {
    return httpService.http<any>({
      path: `${basePath()}/jobs/deleting_jobs_tasks`,
      method: 'GET',
    });
  },

  jobsExist(jobIds: string[]) {
    const body = JSON.stringify({ jobIds });
    return httpService.http<any>({
      path: `${basePath()}/jobs/jobs_exist`,
      method: 'POST',
      body,
    });
  },

  newJobCaps(indexPatternTitle: string, isRollup: boolean = false) {
    const query = isRollup === true ? { rollup: true } : {};
    return httpService.http<any>({
      path: `${basePath()}/jobs/new_job_caps/${indexPatternTitle}`,
      method: 'GET',
      query,
    });
  },

  newJobLineChart(
    indexPatternTitle: string,
    timeField: string,
    start: number,
    end: number,
    intervalMs: number,
    query: any,
    aggFieldNamePairs: AggFieldNamePair[],
    splitFieldName: string | null,
    splitFieldValue: string | null
  ) {
    const body = JSON.stringify({
      indexPatternTitle,
      timeField,
      start,
      end,
      intervalMs,
      query,
      aggFieldNamePairs,
      splitFieldName,
      splitFieldValue,
    });
    return httpService.http<any>({
      path: `${basePath()}/jobs/new_job_line_chart`,
      method: 'POST',
      body,
    });
  },

  newJobPopulationsChart(
    indexPatternTitle: string,
    timeField: string,
    start: number,
    end: number,
    intervalMs: number,
    query: any,
    aggFieldNamePairs: AggFieldNamePair[],
    splitFieldName: string
  ) {
    const body = JSON.stringify({
      indexPatternTitle,
      timeField,
      start,
      end,
      intervalMs,
      query,
      aggFieldNamePairs,
      splitFieldName,
    });
    return httpService.http<any>({
      path: `${basePath()}/jobs/new_job_population_chart`,
      method: 'POST',
      body,
    });
  },

  getAllJobAndGroupIds() {
    return httpService.http<ExistingJobsAndGroups>({
      path: `${basePath()}/jobs/all_jobs_and_group_ids`,
      method: 'GET',
    });
  },

  getLookBackProgress(jobId: string, start: number, end: number) {
    const body = JSON.stringify({
      jobId,
      start,
      end,
    });
    return httpService.http<{ progress: number; isRunning: boolean; isJobClosed: boolean }>({
      path: `${basePath()}/jobs/look_back_progress`,
      method: 'POST',
      body,
    });
  },

  categorizationFieldExamples(
    indexPatternTitle: string,
    query: any,
    size: number,
    field: string,
    timeField: string,
    start: number,
    end: number,
    analyzer: CategorizationAnalyzer
  ) {
    const body = JSON.stringify({
      indexPatternTitle,
      query,
      size,
      field,
      timeField,
      start,
      end,
      analyzer,
    });
    return httpService.http<{
      examples: CategoryFieldExample[];
      sampleSize: number;
      overallValidStatus: CATEGORY_EXAMPLES_VALIDATION_STATUS;
      validationChecks: FieldExampleCheck[];
    }>({
      path: `${basePath()}/jobs/categorization_field_examples`,
      method: 'POST',
      body,
    });
  },

  topCategories(jobId: string, count: number) {
    const body = JSON.stringify({ jobId, count });
    return httpService.http<{
      total: number;
      categories: Array<{ count?: number; category: Category }>;
    }>({
      path: `${basePath()}/jobs/top_categories`,
      method: 'POST',
      body,
    });
  },

  revertModelSnapshot(
    jobId: string,
    snapshotId: string,
    replay: boolean,
    end?: number,
    calendarEvents?: Array<{ start: number; end: number; description: string }>
  ) {
    const body = JSON.stringify({ jobId, snapshotId, replay, end, calendarEvents });
    return httpService.http<{
      total: number;
      categories: Array<{ count?: number; category: Category }>;
    }>({
      path: `${basePath()}/jobs/revert_model_snapshot`,
      method: 'POST',
      body,
    });
  },
});
