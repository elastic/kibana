/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Observable } from 'rxjs';
import type { HttpStart } from 'kibana/public';
import { HttpService } from '../http_service';

import { annotations } from './annotations';
import { dataFrameAnalytics } from './data_frame_analytics';
import { filters } from './filters';
import { resultsApiProvider } from './results';
import { jobsApiProvider } from './jobs';
import { fileDatavisualizer } from './datavisualizer';
import { savedObjectsApiProvider } from './saved_objects';
import { trainedModelsApiProvider } from './trained_models';
import type {
  MlServerDefaults,
  MlServerLimits,
  MlNodeCount,
} from '../../../../common/types/ml_server_info';

import type { MlCapabilitiesResponse } from '../../../../common/types/capabilities';
import type { Calendar, CalendarId, UpdateCalendar } from '../../../../common/types/calendars';
import type {
  BucketSpanEstimatorData,
  ResetJobsResponse,
} from '../../../../common/types/job_service';
import type {
  Job,
  JobStats,
  Datafeed,
  CombinedJob,
  Detector,
  AnalysisConfig,
  ModelSnapshot,
  IndicesOptions,
} from '../../../../common/types/anomaly_detection_jobs';
import type { FieldHistogramRequestConfig } from '../../datavisualizer/index_based/common/request';
import type { DataRecognizerConfigResponse, Module } from '../../../../common/types/modules';
import { getHttp } from '../../util/dependency_cache';
import type { RuntimeMappings } from '../../../../common/types/fields';
import type { DatafeedValidationResponse } from '../../../../common/types/job_validation';

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

export interface BucketSpanEstimatorResponse {
  name: string;
  ms: number;
  error?: boolean;
  message?: string;
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

export interface GetModelSnapshotsResponse {
  count: number;
  model_snapshots: ModelSnapshot[];
}

export function basePath() {
  return '/api/ml';
}

/**
 * Temp solution to allow {@link ml} service to use http from
 * the dependency_cache.
 */
const proxyHttpStart = new Proxy<HttpStart>({} as unknown as HttpStart, {
  get(obj, prop: keyof HttpStart) {
    try {
      return getHttp()[prop];
    } catch (e) {
      if (prop === 'getLoadingCount$') {
        return () => {};
      }
      // eslint-disable-next-line no-console
      console.error(e);
    }
  },
});

export type MlApiServices = ReturnType<typeof mlApiServicesProvider>;

export const ml = mlApiServicesProvider(new HttpService(proxyHttpStart));

export function mlApiServicesProvider(httpService: HttpService) {
  return {
    getJobs(obj?: { jobId?: string }) {
      const jobId = obj && obj.jobId ? `/${obj.jobId}` : '';
      return httpService.http<{ jobs: Job[]; count: number }>({
        path: `${basePath()}/anomaly_detectors${jobId}`,
      });
    },

    getJobStats(obj: { jobId?: string }) {
      const jobId = obj && obj.jobId ? `/${obj.jobId}` : '';
      return httpService.http<{ jobs: JobStats[]; count: number }>({
        path: `${basePath()}/anomaly_detectors${jobId}/_stats`,
      });
    },

    addJob({ jobId, job }: { jobId: string; job: Job }) {
      const body = JSON.stringify(job);
      return httpService.http<any>({
        path: `${basePath()}/anomaly_detectors/${jobId}`,
        method: 'PUT',
        body,
      });
    },

    openJob({ jobId }: { jobId: string }) {
      return httpService.http<any>({
        path: `${basePath()}/anomaly_detectors/${jobId}/_open`,
        method: 'POST',
      });
    },

    closeJob({ jobId }: { jobId: string }) {
      return httpService.http<any>({
        path: `${basePath()}/anomaly_detectors/${jobId}/_close`,
        method: 'POST',
      });
    },

    forceCloseJob({ jobId }: { jobId: string }) {
      return httpService.http<any>({
        path: `${basePath()}/anomaly_detectors/${jobId}/_close?force=true`,
        method: 'POST',
      });
    },

    deleteJob({ jobId }: { jobId: string }) {
      return httpService.http<estypes.MlDeleteJobResponse>({
        path: `${basePath()}/anomaly_detectors/${jobId}`,
        method: 'DELETE',
      });
    },

    forceDeleteJob({ jobId }: { jobId: string }) {
      return httpService.http<estypes.MlDeleteJobResponse>({
        path: `${basePath()}/anomaly_detectors/${jobId}?force=true`,
        method: 'DELETE',
      });
    },

    updateJob({ jobId, job }: { jobId: string; job: Job }) {
      const body = JSON.stringify(job);
      return httpService.http<any>({
        path: `${basePath()}/anomaly_detectors/${jobId}/_update`,
        method: 'POST',
        body,
      });
    },

    resetJob({ jobId }: { jobId: string }) {
      return httpService.http<ResetJobsResponse>({
        path: `${basePath()}/anomaly_detectors/${jobId}/_reset`,
        method: 'POST',
      });
    },

    estimateBucketSpan(obj: BucketSpanEstimatorData) {
      const body = JSON.stringify(obj);
      return httpService.http<BucketSpanEstimatorResponse>({
        path: `${basePath()}/validate/estimate_bucket_span`,
        method: 'POST',
        body,
      });
    },

    validateJob(payload: {
      job: CombinedJob;
      duration: {
        start?: number;
        end?: number;
      };
      fields?: any[];
    }) {
      const body = JSON.stringify(payload);
      return httpService.http<any>({
        path: `${basePath()}/validate/job`,
        method: 'POST',
        body,
      });
    },

    validateDatafeedPreview(payload: { job: CombinedJob }) {
      const body = JSON.stringify(payload);
      return httpService.http<DatafeedValidationResponse>({
        path: `${basePath()}/validate/datafeed_preview`,
        method: 'POST',
        body,
      });
    },

    validateCardinality$(job: CombinedJob): Observable<CardinalityValidationResults> {
      const body = JSON.stringify(job);
      return httpService.http$({
        path: `${basePath()}/validate/cardinality`,
        method: 'POST',
        body,
      });
    },

    getDatafeeds(obj: { datafeedId: string }) {
      const datafeedId = obj && obj.datafeedId ? `/${obj.datafeedId}` : '';
      return httpService.http<any>({
        path: `${basePath()}/datafeeds${datafeedId}`,
      });
    },

    getDatafeedStats(obj: { datafeedId: string }) {
      const datafeedId = obj && obj.datafeedId ? `/${obj.datafeedId}` : '';
      return httpService.http<any>({
        path: `${basePath()}/datafeeds${datafeedId}/_stats`,
      });
    },

    addDatafeed({ datafeedId, datafeedConfig }: { datafeedId: string; datafeedConfig: Datafeed }) {
      const body = JSON.stringify(datafeedConfig);
      return httpService.http<any>({
        path: `${basePath()}/datafeeds/${datafeedId}`,
        method: 'PUT',
        body,
      });
    },

    updateDatafeed({
      datafeedId,
      datafeedConfig,
    }: {
      datafeedId: string;
      datafeedConfig: Partial<Datafeed>;
    }) {
      const body = JSON.stringify(datafeedConfig);
      return httpService.http<any>({
        path: `${basePath()}/datafeeds/${datafeedId}/_update`,
        method: 'POST',
        body,
      });
    },

    deleteDatafeed({ datafeedId }: { datafeedId: string }) {
      return httpService.http<any>({
        path: `${basePath()}/datafeeds/${datafeedId}`,
        method: 'DELETE',
      });
    },

    forceDeleteDatafeed({ datafeedId }: { datafeedId: string }) {
      return httpService.http<any>({
        path: `${basePath()}/datafeeds/${datafeedId}?force=true`,
        method: 'DELETE',
      });
    },

    startDatafeed({ datafeedId, start, end }: { datafeedId: string; start: number; end: number }) {
      const body = JSON.stringify({
        ...(start !== undefined ? { start } : {}),
        ...(end !== undefined ? { end } : {}),
      });

      return httpService.http<any>({
        path: `${basePath()}/datafeeds/${datafeedId}/_start`,
        method: 'POST',
        body,
      });
    },

    stopDatafeed({ datafeedId }: { datafeedId: string }) {
      return httpService.http<any>({
        path: `${basePath()}/datafeeds/${datafeedId}/_stop`,
        method: 'POST',
      });
    },

    forceStopDatafeed({ datafeedId }: { datafeedId: string }) {
      return httpService.http<any>({
        path: `${basePath()}/datafeeds/${datafeedId}/_stop?force=true`,
        method: 'POST',
      });
    },

    datafeedPreview({ datafeedId }: { datafeedId: string }) {
      return httpService.http<any>({
        path: `${basePath()}/datafeeds/${datafeedId}/_preview`,
        method: 'GET',
      });
    },

    validateDetector({ detector }: { detector: Detector }) {
      const body = JSON.stringify(detector);
      return httpService.http<any>({
        path: `${basePath()}/anomaly_detectors/_validate/detector`,
        method: 'POST',
        body,
      });
    },

    forecast({ jobId, duration }: { jobId: string; duration?: string }) {
      const body = JSON.stringify({
        ...(duration !== undefined ? { duration } : {}),
      });

      return httpService.http<any>({
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
      overallScore,
    }: {
      jobId: string;
      topN: string;
      bucketSpan: string;
      start: number;
      end: number;
      overallScore?: number;
    }) {
      const body = JSON.stringify({
        topN,
        bucketSpan,
        start,
        end,
        ...(overallScore ? { overall_score: overallScore } : {}),
      });
      return httpService.http<any>({
        path: `${basePath()}/anomaly_detectors/${jobId}/results/overall_buckets`,
        method: 'POST',
        body,
      });
    },

    hasPrivileges(obj: any) {
      const body = JSON.stringify(obj);
      return httpService.http<any>({
        path: `${basePath()}/_has_privileges`,
        method: 'POST',
        body,
      });
    },

    checkMlCapabilities() {
      return httpService.http<MlCapabilitiesResponse>({
        path: `${basePath()}/ml_capabilities`,
        method: 'GET',
      });
    },

    checkManageMLCapabilities() {
      return httpService.http<MlCapabilitiesResponse>({
        path: `${basePath()}/ml_capabilities`,
        method: 'GET',
      });
    },

    checkIndicesExists({ indices }: { indices: string[] }) {
      const body = JSON.stringify({ indices });

      return httpService.http<Record<string, { exists: boolean }>>({
        path: `${basePath()}/index_exists`,
        method: 'POST',
        body,
      });
    },

    getFieldCaps({ index, fields }: { index: string; fields: string[] }) {
      const body = JSON.stringify({
        ...(index !== undefined ? { index } : {}),
        ...(fields !== undefined ? { fields } : {}),
      });

      return httpService.http<any>({
        path: `${basePath()}/indices/field_caps`,
        method: 'POST',
        body,
      });
    },

    recognizeIndex({ indexPatternTitle }: { indexPatternTitle: string }) {
      return httpService.http<any>({
        path: `${basePath()}/modules/recognize/${indexPatternTitle}`,
        method: 'GET',
      });
    },

    listDataRecognizerModules() {
      return httpService.http<any>({
        path: `${basePath()}/modules/get_module`,
        method: 'GET',
      });
    },

    getDataRecognizerModule({ moduleId }: { moduleId: string }) {
      return httpService.http<Module>({
        path: `${basePath()}/modules/get_module/${moduleId}`,
        method: 'GET',
      });
    },

    dataRecognizerModuleJobsExist({ moduleId }: { moduleId: string }) {
      return httpService.http<any>({
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

      return httpService.http<DataRecognizerConfigResponse>({
        path: `${basePath()}/modules/setup/${moduleId}`,
        method: 'POST',
        body,
      });
    },

    getVisualizerFieldHistograms({
      indexPattern,
      query,
      fields,
      samplerShardSize,
      runtimeMappings,
    }: {
      indexPattern: string;
      query: any;
      fields: FieldHistogramRequestConfig[];
      samplerShardSize?: number;
      runtimeMappings?: RuntimeMappings;
    }) {
      const body = JSON.stringify({
        query,
        fields,
        samplerShardSize,
        runtimeMappings,
      });

      return httpService.http<any>({
        path: `${basePath()}/data_visualizer/get_field_histograms/${indexPattern}`,
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
      return httpService.http<Calendar[]>({
        path: `${basePath()}/calendars${calendarIdsPathComponent}`,
        method: 'GET',
      });
    },

    addCalendar(obj: Calendar) {
      const body = JSON.stringify(obj);
      return httpService.http<any>({
        path: `${basePath()}/calendars`,
        method: 'PUT',
        body,
      });
    },

    updateCalendar(obj: UpdateCalendar) {
      const calendarId = obj && obj.calendarId ? `/${obj.calendarId}` : '';
      const body = JSON.stringify(obj);
      return httpService.http<any>({
        path: `${basePath()}/calendars${calendarId}`,
        method: 'PUT',
        body,
      });
    },

    deleteCalendar({ calendarId }: { calendarId?: string }) {
      return httpService.http<any>({
        path: `${basePath()}/calendars/${calendarId}`,
        method: 'DELETE',
      });
    },

    mlNodeCount() {
      return httpService.http<MlNodeCount>({
        path: `${basePath()}/ml_node_count`,
        method: 'GET',
      });
    },

    mlInfo() {
      return httpService.http<MlInfoResponse>({
        path: `${basePath()}/info`,
        method: 'GET',
      });
    },

    calculateModelMemoryLimit$({
      datafeedConfig,
      analysisConfig,
      indexPattern,
      query,
      timeFieldName,
      earliestMs,
      latestMs,
    }: {
      datafeedConfig?: Datafeed;
      analysisConfig: AnalysisConfig;
      indexPattern: string;
      query: any;
      timeFieldName: string;
      earliestMs: number;
      latestMs: number;
    }) {
      const body = JSON.stringify({
        datafeedConfig,
        analysisConfig,
        indexPattern,
        query,
        timeFieldName,
        earliestMs,
        latestMs,
      });

      return httpService.http$<{ modelMemoryLimit: string }>({
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
      const body = JSON.stringify({
        index,
        fieldNames,
        query,
        timeFieldName,
        earliestMs,
        latestMs,
      });

      return httpService.http<any>({
        path: `${basePath()}/fields_service/field_cardinality`,
        method: 'POST',
        body,
      });
    },

    getTimeFieldRange({
      index,
      timeFieldName,
      query,
      runtimeMappings,
      indicesOptions,
    }: {
      index: string;
      timeFieldName?: string;
      query: any;
      runtimeMappings?: RuntimeMappings;
      indicesOptions?: IndicesOptions;
    }) {
      const body = JSON.stringify({ index, timeFieldName, query, runtimeMappings, indicesOptions });

      return httpService.http<GetTimeFieldRangeResponse>({
        path: `${basePath()}/fields_service/time_field_range`,
        method: 'POST',
        body,
      });
    },

    esSearch(obj: any) {
      const body = JSON.stringify(obj);
      return httpService.http<any>({
        path: `${basePath()}/es_search`,
        method: 'POST',
        body,
      });
    },

    esSearch$(obj: any) {
      const body = JSON.stringify(obj);
      return httpService.http$<any>({
        path: `${basePath()}/es_search`,
        method: 'POST',
        body,
      });
    },

    getIndices() {
      const tempBasePath = '/api';
      return httpService.http<Array<{ name: string }>>({
        path: `${tempBasePath}/index_management/indices`,
        method: 'GET',
      });
    },

    getModelSnapshots(jobId: string, snapshotId?: string) {
      return httpService.http<GetModelSnapshotsResponse>({
        path: `${basePath()}/anomaly_detectors/${jobId}/model_snapshots${
          snapshotId !== undefined ? `/${snapshotId}` : ''
        }`,
      });
    },

    updateModelSnapshot(
      jobId: string,
      snapshotId: string,
      body: { description?: string; retain?: boolean }
    ) {
      return httpService.http<any>({
        path: `${basePath()}/anomaly_detectors/${jobId}/model_snapshots/${snapshotId}/_update`,
        method: 'POST',
        body: JSON.stringify(body),
      });
    },

    deleteModelSnapshot(jobId: string, snapshotId: string) {
      return httpService.http<any>({
        path: `${basePath()}/anomaly_detectors/${jobId}/model_snapshots/${snapshotId}`,
        method: 'DELETE',
      });
    },

    annotations,
    dataFrameAnalytics,
    filters,
    results: resultsApiProvider(httpService),
    jobs: jobsApiProvider(httpService),
    fileDatavisualizer,
    savedObjects: savedObjectsApiProvider(httpService),
    trainedModels: trainedModelsApiProvider(httpService),
  };
}
