/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { HttpService } from '../http_service';

import type { Dictionary } from '../../../../common/types/common';
import type {
  MlJobWithTimeRange,
  MlSummaryJobs,
  CombinedJobWithStats,
  Job,
  Datafeed,
  IndicesOptions,
} from '../../../../common/types/anomaly_detection_jobs';
import type { JobMessage } from '../../../../common/types/audit_message';
import type { JobAction } from '../../../../common/constants/job_actions';
import type { AggFieldNamePair, RuntimeMappings } from '../../../../common/types/fields';
import type { ExistingJobsAndGroups } from '../job_service';
import type {
  CategorizationAnalyzer,
  CategoryFieldExample,
  FieldExampleCheck,
} from '../../../../common/types/categories';
import { CATEGORY_EXAMPLES_VALIDATION_STATUS } from '../../../../common/constants/categorization_job';
import type { Category } from '../../../../common/types/categories';
import type {
  JobsExistResponse,
  BulkCreateResults,
  ResetJobsResponse,
} from '../../../../common/types/job_service';
import { ML_BASE_PATH } from '../../../../common/constants/app';

export const jobsApiProvider = (httpService: HttpService) => ({
  jobsSummary(jobIds: string[]) {
    const body = JSON.stringify({ jobIds });
    return httpService.http<MlSummaryJobs>({
      path: `${ML_BASE_PATH}/jobs/jobs_summary`,
      method: 'POST',
      body,
    });
  },

  jobIdsWithGeo() {
    return httpService.http<string[]>({
      path: `${ML_BASE_PATH}/jobs/jobs_with_geo`,
      method: 'GET',
    });
  },

  jobsWithTimerange(dateFormatTz: string) {
    const body = JSON.stringify({ dateFormatTz });
    return httpService.http<{
      jobs: MlJobWithTimeRange[];
      jobsMap: Dictionary<MlJobWithTimeRange>;
    }>({
      path: `${ML_BASE_PATH}/jobs/jobs_with_time_range`,
      method: 'POST',
      body,
    });
  },

  jobForCloning(jobId: string) {
    const body = JSON.stringify({ jobId });
    return httpService.http<{ job?: Job; datafeed?: Datafeed } | undefined>({
      path: `${ML_BASE_PATH}/jobs/job_for_cloning`,
      method: 'POST',
      body,
    });
  },

  jobs(jobIds: string[]) {
    const body = JSON.stringify({ jobIds });
    return httpService.http<CombinedJobWithStats[]>({
      path: `${ML_BASE_PATH}/jobs/jobs`,
      method: 'POST',
      body,
    });
  },

  groups() {
    return httpService.http<any>({
      path: `${ML_BASE_PATH}/jobs/groups`,
      method: 'GET',
    });
  },

  updateGroups(updatedJobs: Array<{ jobId: string; groups: string[] }>) {
    const body = JSON.stringify({ jobs: updatedJobs });
    return httpService.http<any>({
      path: `${ML_BASE_PATH}/jobs/update_groups`,
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
      path: `${ML_BASE_PATH}/jobs/force_start_datafeeds`,
      method: 'POST',
      body,
    });
  },

  stopDatafeeds(datafeedIds: string[]) {
    const body = JSON.stringify({ datafeedIds });
    return httpService.http<any>({
      path: `${ML_BASE_PATH}/jobs/stop_datafeeds`,
      method: 'POST',
      body,
    });
  },

  deleteJobs(jobIds: string[]) {
    const body = JSON.stringify({ jobIds });
    return httpService.http<any>({
      path: `${ML_BASE_PATH}/jobs/delete_jobs`,
      method: 'POST',
      body,
    });
  },

  closeJobs(jobIds: string[]) {
    const body = JSON.stringify({ jobIds });
    return httpService.http<any>({
      path: `${ML_BASE_PATH}/jobs/close_jobs`,
      method: 'POST',
      body,
    });
  },

  resetJobs(jobIds: string[]) {
    const body = JSON.stringify({ jobIds });
    return httpService.http<ResetJobsResponse>({
      path: `${ML_BASE_PATH}/jobs/reset_jobs`,
      method: 'POST',
      body,
    });
  },

  forceStopAndCloseJob(jobId: string) {
    const body = JSON.stringify({ jobId });
    return httpService.http<{ success: boolean }>({
      path: `${ML_BASE_PATH}/jobs/force_stop_and_close_job`,
      method: 'POST',
      body,
    });
  },

  jobAuditMessages({
    jobId,
    from,
    start,
    end,
  }: {
    jobId: string;
    from?: number;
    start?: string;
    end?: string;
  }) {
    const jobIdString = jobId !== undefined ? `/${jobId}` : '';
    const query = {
      ...(from !== undefined ? { from } : {}),
      ...(start !== undefined && end !== undefined ? { start, end } : {}),
    };

    return httpService.http<{ messages: JobMessage[]; notificationIndices: string[] }>({
      path: `${ML_BASE_PATH}/job_audit_messages/messages${jobIdString}`,
      method: 'GET',
      query,
    });
  },

  clearJobAuditMessages(jobId: string, notificationIndices: string[]) {
    const body = JSON.stringify({ jobId, notificationIndices });
    return httpService.http<{ success: boolean; latest_cleared: number }>({
      path: `${ML_BASE_PATH}/job_audit_messages/clear_messages`,
      method: 'PUT',
      body,
    });
  },

  blockingJobTasks() {
    return httpService.http<Record<string, JobAction>>({
      path: `${ML_BASE_PATH}/jobs/blocking_jobs_tasks`,
      method: 'GET',
    });
  },

  jobsExist(jobIds: string[], allSpaces: boolean = false) {
    const body = JSON.stringify({ jobIds, allSpaces });
    return httpService.http<JobsExistResponse>({
      path: `${ML_BASE_PATH}/jobs/jobs_exist`,
      method: 'POST',
      body,
    });
  },

  jobsExist$(jobIds: string[], allSpaces: boolean = false): Observable<JobsExistResponse> {
    const body = JSON.stringify({ jobIds, allSpaces });
    return httpService.http$({
      path: `${ML_BASE_PATH}/jobs/jobs_exist`,
      method: 'POST',
      body,
    });
  },

  newJobCaps(indexPatternTitle: string, isRollup: boolean = false) {
    const query = isRollup === true ? { rollup: true } : {};
    return httpService.http<any>({
      path: `${ML_BASE_PATH}/jobs/new_job_caps/${indexPatternTitle}`,
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
    splitFieldValue: string | null,
    runtimeMappings?: RuntimeMappings,
    indicesOptions?: IndicesOptions
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
      runtimeMappings,
      indicesOptions,
    });
    return httpService.http<any>({
      path: `${ML_BASE_PATH}/jobs/new_job_line_chart`,
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
    splitFieldName: string,
    runtimeMappings?: RuntimeMappings,
    indicesOptions?: IndicesOptions
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
      runtimeMappings,
      indicesOptions,
    });
    return httpService.http<any>({
      path: `${ML_BASE_PATH}/jobs/new_job_population_chart`,
      method: 'POST',
      body,
    });
  },

  getAllJobAndGroupIds() {
    return httpService.http<ExistingJobsAndGroups>({
      path: `${ML_BASE_PATH}/jobs/all_jobs_and_group_ids`,
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
      path: `${ML_BASE_PATH}/jobs/look_back_progress`,
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
    analyzer: CategorizationAnalyzer,
    runtimeMappings?: RuntimeMappings,
    indicesOptions?: IndicesOptions
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
      runtimeMappings,
      indicesOptions,
    });
    return httpService.http<{
      examples: CategoryFieldExample[];
      sampleSize: number;
      overallValidStatus: CATEGORY_EXAMPLES_VALIDATION_STATUS;
      validationChecks: FieldExampleCheck[];
    }>({
      path: `${ML_BASE_PATH}/jobs/categorization_field_examples`,
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
      path: `${ML_BASE_PATH}/jobs/top_categories`,
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
      path: `${ML_BASE_PATH}/jobs/revert_model_snapshot`,
      method: 'POST',
      body,
    });
  },

  datafeedPreview(datafeedId?: string, job?: Job, datafeed?: Datafeed) {
    const body = JSON.stringify({ datafeedId, job, datafeed });
    return httpService.http<{
      total: number;
      categories: Array<{ count?: number; category: Category }>;
    }>({
      path: `${ML_BASE_PATH}/jobs/datafeed_preview`,
      method: 'POST',
      body,
    });
  },

  bulkCreateJobs(jobs: { job: Job; datafeed: Datafeed } | Array<{ job: Job; datafeed: Datafeed }>) {
    const body = JSON.stringify(jobs);
    return httpService.http<BulkCreateResults>({
      path: `${ML_BASE_PATH}/jobs/bulk_create`,
      method: 'POST',
      body,
    });
  },
});
