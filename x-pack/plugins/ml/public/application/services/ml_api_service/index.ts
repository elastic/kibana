/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { http, http$ } from '../http_service';

import { annotations } from './annotations';
import { dataFrameAnalytics } from './data_frame_analytics';
import { filters } from './filters';
import { results } from './results';
import { jobs } from './jobs';
import { fileDatavisualizer } from './datavisualizer';
import { MlServerDefaults, MlServerLimits } from '../../../../common/types/ml_server_info';

import { MlCapabilitiesResponse } from '../../../../common/types/capabilities';
import { Calendar, CalendarId, UpdateCalendar } from '../../../../common/types/calendars';
import {
  Job,
  Datafeed,
  CombinedJob,
  Detector,
  AnalysisConfig,
} from '../../../../common/types/anomaly_detection_jobs';
import { ES_AGGREGATION } from '../../../../common/constants/aggregation_types';
import { FieldRequestConfig } from '../../datavisualizer/index_based/common';
import { DataRecognizerConfigResponse, Module } from '../../../../common/types/modules';

export interface MlInfoResponse {
  defaults: MlServerDefaults;
  limits: MlServerLimits;
  native_code: {
    build_hash: string;
    version: string;
  };
  upgrade_mode: boolean;
  cloudId?: string;
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
}

export interface BucketSpanEstimatorResponse {
  name: string;
  ms: number;
  error?: boolean;
  message?: { msg: string } | string;
}

export interface GetTimeFieldRangeResponse {
  success: boolean;
  start: { epoch: number; string: string };
  end: { epoch: number; string: string };
}

export interface SuccessCardinality {
  id: 'success_cardinality';
}

export interface CardinalityModelPlotHigh {
  id: 'cardinality_model_plot_high';
  modelPlotCardinality: number;
}

export type CardinalityValidationResult = SuccessCardinality | CardinalityModelPlotHigh;
export type CardinalityValidationResults = CardinalityValidationResult[];

export function basePath() {
  return '/api/ml';
}

export const ml = {
  getJobs(obj?: { jobId?: string }) {
    const jobId = obj && obj.jobId ? `/${obj.jobId}` : '';
    return http<any>({
      path: `${basePath()}/anomaly_detectors${jobId}`,
    });
  },

  getJobStats(obj: { jobId?: string }) {
    const jobId = obj && obj.jobId ? `/${obj.jobId}` : '';
    return http<any>({
      path: `${basePath()}/anomaly_detectors${jobId}/_stats`,
    });
  },

  addJob({ jobId, job }: { jobId: string; job: Job }) {
    const body = JSON.stringify(job);
    return http<any>({
      path: `${basePath()}/anomaly_detectors/${jobId}`,
      method: 'PUT',
      body,
    });
  },

  openJob({ jobId }: { jobId: string }) {
    return http<any>({
      path: `${basePath()}/anomaly_detectors/${jobId}/_open`,
      method: 'POST',
    });
  },

  closeJob({ jobId }: { jobId: string }) {
    return http<any>({
      path: `${basePath()}/anomaly_detectors/${jobId}/_close`,
      method: 'POST',
    });
  },

  deleteJob({ jobId }: { jobId: string }) {
    return http<any>({
      path: `${basePath()}/anomaly_detectors/${jobId}`,
      method: 'DELETE',
    });
  },

  forceDeleteJob({ jobId }: { jobId: string }) {
    return http<any>({
      path: `${basePath()}/anomaly_detectors/${jobId}?force=true`,
      method: 'DELETE',
    });
  },

  updateJob({ jobId, job }: { jobId: string; job: Job }) {
    const body = JSON.stringify(job);
    return http<any>({
      path: `${basePath()}/anomaly_detectors/${jobId}/_update`,
      method: 'POST',
      body,
    });
  },

  estimateBucketSpan(obj: BucketSpanEstimatorData) {
    const body = JSON.stringify(obj);
    return http<BucketSpanEstimatorResponse>({
      path: `${basePath()}/validate/estimate_bucket_span`,
      method: 'POST',
      body,
    });
  },

  validateJob(payload: {
    job: Job;
    duration: {
      start?: number;
      end?: number;
    };
    fields?: any[];
  }) {
    const body = JSON.stringify(payload);
    return http<any>({
      path: `${basePath()}/validate/job`,
      method: 'POST',
      body,
    });
  },

  validateCardinality$(job: CombinedJob): Observable<CardinalityValidationResults> {
    const body = JSON.stringify(job);
    return http$({
      path: `${basePath()}/validate/cardinality`,
      method: 'POST',
      body,
    });
  },

  getDatafeeds(obj: { datafeedId: string }) {
    const datafeedId = obj && obj.datafeedId ? `/${obj.datafeedId}` : '';
    return http<any>({
      path: `${basePath()}/datafeeds${datafeedId}`,
    });
  },

  getDatafeedStats(obj: { datafeedId: string }) {
    const datafeedId = obj && obj.datafeedId ? `/${obj.datafeedId}` : '';
    return http<any>({
      path: `${basePath()}/datafeeds${datafeedId}/_stats`,
    });
  },

  addDatafeed({ datafeedId, datafeedConfig }: { datafeedId: string; datafeedConfig: Datafeed }) {
    const body = JSON.stringify(datafeedConfig);
    return http<any>({
      path: `${basePath()}/datafeeds/${datafeedId}`,
      method: 'PUT',
      body,
    });
  },

  updateDatafeed({ datafeedId, datafeedConfig }: { datafeedId: string; datafeedConfig: Datafeed }) {
    const body = JSON.stringify(datafeedConfig);
    return http<any>({
      path: `${basePath()}/datafeeds/${datafeedId}/_update`,
      method: 'POST',
      body,
    });
  },

  deleteDatafeed({ datafeedId }: { datafeedId: string }) {
    return http<any>({
      path: `${basePath()}/datafeeds/${datafeedId}`,
      method: 'DELETE',
    });
  },

  forceDeleteDatafeed({ datafeedId }: { datafeedId: string }) {
    return http<any>({
      path: `${basePath()}/datafeeds/${datafeedId}?force=true`,
      method: 'DELETE',
    });
  },

  startDatafeed({ datafeedId, start, end }: { datafeedId: string; start: number; end: number }) {
    const body = JSON.stringify({
      ...(start !== undefined ? { start } : {}),
      ...(end !== undefined ? { end } : {}),
    });

    return http<any>({
      path: `${basePath()}/datafeeds/${datafeedId}/_start`,
      method: 'POST',
      body,
    });
  },

  stopDatafeed({ datafeedId }: { datafeedId: string }) {
    return http<any>({
      path: `${basePath()}/datafeeds/${datafeedId}/_stop`,
      method: 'POST',
    });
  },

  datafeedPreview({ datafeedId }: { datafeedId: string }) {
    return http<any>({
      path: `${basePath()}/datafeeds/${datafeedId}/_preview`,
      method: 'GET',
    });
  },

  validateDetector({ detector }: { detector: Detector }) {
    const body = JSON.stringify(detector);
    return http<any>({
      path: `${basePath()}/anomaly_detectors/_validate/detector`,
      method: 'POST',
      body,
    });
  },

  forecast({ jobId, duration }: { jobId: string; duration?: string }) {
    const body = JSON.stringify({
      ...(duration !== undefined ? { duration } : {}),
    });

    return http<any>({
      path: `${basePath()}/anomaly_detectors/${jobId}/_forecast`,
      method: 'POST',
      body,
    });
  },

  overallBuckets({
    jobId,
    topN,
    bucketSpan,
    start,
    end,
  }: {
    jobId: string;
    topN: string;
    bucketSpan: string;
    start: number;
    end: number;
  }) {
    const body = JSON.stringify({ topN, bucketSpan, start, end });
    return http<any>({
      path: `${basePath()}/anomaly_detectors/${jobId}/results/overall_buckets`,
      method: 'POST',
      body,
    });
  },

  hasPrivileges(obj: any) {
    const body = JSON.stringify(obj);
    return http<any>({
      path: `${basePath()}/_has_privileges`,
      method: 'POST',
      body,
    });
  },

  checkMlCapabilities() {
    return http<MlCapabilitiesResponse>({
      path: `${basePath()}/ml_capabilities`,
      method: 'GET',
    });
  },

  checkManageMLCapabilities() {
    return http<MlCapabilitiesResponse>({
      path: `${basePath()}/ml_capabilities`,
      method: 'GET',
    });
  },

  getNotificationSettings() {
    return http<any>({
      path: `${basePath()}/notification_settings`,
      method: 'GET',
    });
  },

  getFieldCaps({ index, fields }: { index: string; fields: string[] }) {
    const body = JSON.stringify({
      ...(index !== undefined ? { index } : {}),
      ...(fields !== undefined ? { fields } : {}),
    });

    return http<any>({
      path: `${basePath()}/indices/field_caps`,
      method: 'POST',
      body,
    });
  },

  recognizeIndex({ indexPatternTitle }: { indexPatternTitle: string }) {
    return http<any>({
      path: `${basePath()}/modules/recognize/${indexPatternTitle}`,
      method: 'GET',
    });
  },

  listDataRecognizerModules() {
    return http<any>({
      path: `${basePath()}/modules/get_module`,
      method: 'GET',
    });
  },

  getDataRecognizerModule({ moduleId }: { moduleId: string }) {
    return http<Module>({
      path: `${basePath()}/modules/get_module/${moduleId}`,
      method: 'GET',
    });
  },

  dataRecognizerModuleJobsExist({ moduleId }: { moduleId: string }) {
    return http<any>({
      path: `${basePath()}/modules/jobs_exist/${moduleId}`,
      method: 'GET',
    });
  },

  setupDataRecognizerConfig({
    moduleId,
    prefix,
    groups,
    indexPatternName,
    query,
    useDedicatedIndex,
    startDatafeed,
    start,
    end,
    jobOverrides,
    estimateModelMemory,
  }: {
    moduleId: string;
    prefix?: string;
    groups?: string[];
    indexPatternName?: string;
    query?: any;
    useDedicatedIndex?: boolean;
    startDatafeed?: boolean;
    start?: number;
    end?: number;
    jobOverrides?: Array<Partial<Job>>;
    estimateModelMemory?: boolean;
  }) {
    const body = JSON.stringify({
      prefix,
      groups,
      indexPatternName,
      query,
      useDedicatedIndex,
      startDatafeed,
      start,
      end,
      jobOverrides,
      estimateModelMemory,
    });

    return http<DataRecognizerConfigResponse>({
      path: `${basePath()}/modules/setup/${moduleId}`,
      method: 'POST',
      body,
    });
  },

  getVisualizerFieldStats({
    indexPatternTitle,
    query,
    timeFieldName,
    earliest,
    latest,
    samplerShardSize,
    interval,
    fields,
    maxExamples,
  }: {
    indexPatternTitle: string;
    query: any;
    timeFieldName?: string;
    earliest?: number;
    latest?: number;
    samplerShardSize?: number;
    interval?: string;
    fields?: FieldRequestConfig[];
    maxExamples?: number;
  }) {
    const body = JSON.stringify({
      query,
      timeFieldName,
      earliest,
      latest,
      samplerShardSize,
      interval,
      fields,
      maxExamples,
    });

    return http<any>({
      path: `${basePath()}/data_visualizer/get_field_stats/${indexPatternTitle}`,
      method: 'POST',
      body,
    });
  },

  getVisualizerOverallStats({
    indexPatternTitle,
    query,
    timeFieldName,
    earliest,
    latest,
    samplerShardSize,
    aggregatableFields,
    nonAggregatableFields,
  }: {
    indexPatternTitle: string;
    query: any;
    timeFieldName?: string;
    earliest?: number;
    latest?: number;
    samplerShardSize?: number;
    aggregatableFields: string[];
    nonAggregatableFields: string[];
  }) {
    const body = JSON.stringify({
      query,
      timeFieldName,
      earliest,
      latest,
      samplerShardSize,
      aggregatableFields,
      nonAggregatableFields,
    });

    return http<any>({
      path: `${basePath()}/data_visualizer/get_overall_stats/${indexPatternTitle}`,
      method: 'POST',
      body,
    });
  },

  /**
   * Gets a list of calendars
   * @param obj
   * @returns {Promise<Calendar[]>}
   */
  calendars(obj?: { calendarId?: CalendarId; calendarIds?: CalendarId[] }) {
    const { calendarId, calendarIds } = obj || {};
    let calendarIdsPathComponent = '';
    if (calendarId) {
      calendarIdsPathComponent = `/${calendarId}`;
    } else if (calendarIds) {
      calendarIdsPathComponent = `/${calendarIds.join(',')}`;
    }
    return http<Calendar[]>({
      path: `${basePath()}/calendars${calendarIdsPathComponent}`,
      method: 'GET',
    });
  },

  addCalendar(obj: Calendar) {
    const body = JSON.stringify(obj);
    return http<any>({
      path: `${basePath()}/calendars`,
      method: 'PUT',
      body,
    });
  },

  updateCalendar(obj: UpdateCalendar) {
    const calendarId = obj && obj.calendarId ? `/${obj.calendarId}` : '';
    const body = JSON.stringify(obj);
    return http<any>({
      path: `${basePath()}/calendars${calendarId}`,
      method: 'PUT',
      body,
    });
  },

  deleteCalendar({ calendarId }: { calendarId?: string }) {
    return http<any>({
      path: `${basePath()}/calendars/${calendarId}`,
      method: 'DELETE',
    });
  },

  mlNodeCount() {
    return http<{ count: number }>({
      path: `${basePath()}/ml_node_count`,
      method: 'GET',
    });
  },

  mlInfo() {
    return http<MlInfoResponse>({
      path: `${basePath()}/info`,
      method: 'GET',
    });
  },

  calculateModelMemoryLimit$({
    analysisConfig,
    indexPattern,
    query,
    timeFieldName,
    earliestMs,
    latestMs,
  }: {
    analysisConfig: AnalysisConfig;
    indexPattern: string;
    query: any;
    timeFieldName: string;
    earliestMs: number;
    latestMs: number;
  }) {
    const body = JSON.stringify({
      analysisConfig,
      indexPattern,
      query,
      timeFieldName,
      earliestMs,
      latestMs,
    });

    return http$<{ modelMemoryLimit: string }>({
      path: `${basePath()}/validate/calculate_model_memory_limit`,
      method: 'POST',
      body,
    });
  },

  getCardinalityOfFields({
    index,
    fieldNames,
    query,
    timeFieldName,
    earliestMs,
    latestMs,
  }: {
    index: string;
    fieldNames: string[];
    query: any;
    timeFieldName: string;
    earliestMs: number;
    latestMs: number;
  }) {
    const body = JSON.stringify({ index, fieldNames, query, timeFieldName, earliestMs, latestMs });

    return http<any>({
      path: `${basePath()}/fields_service/field_cardinality`,
      method: 'POST',
      body,
    });
  },

  getTimeFieldRange({
    index,
    timeFieldName,
    query,
  }: {
    index: string;
    timeFieldName?: string;
    query: any;
  }) {
    const body = JSON.stringify({ index, timeFieldName, query });

    return http<GetTimeFieldRangeResponse>({
      path: `${basePath()}/fields_service/time_field_range`,
      method: 'POST',
      body,
    });
  },

  esSearch(obj: any) {
    const body = JSON.stringify(obj);
    return http<any>({
      path: `${basePath()}/es_search`,
      method: 'POST',
      body,
    });
  },

  esSearch$(obj: any) {
    const body = JSON.stringify(obj);
    return http$<any>({
      path: `${basePath()}/es_search`,
      method: 'POST',
      body,
    });
  },

  getIndices() {
    const tempBasePath = '/api';
    return http<Array<{ name: string }>>({
      path: `${tempBasePath}/index_management/indices`,
      method: 'GET',
    });
  },

  annotations,
  dataFrameAnalytics,
  filters,
  results,
  jobs,
  fileDatavisualizer,
};
