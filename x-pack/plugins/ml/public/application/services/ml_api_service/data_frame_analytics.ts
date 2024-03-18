/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { NewJobCapsResponse } from '@kbn/ml-anomaly-utils';
import type {
  AnalyticsMapReturnType,
  DataFrameAnalyticsConfig,
  DataFrameAnalyticsStats,
  DeleteDataFrameAnalyticsWithIndexStatus,
  UpdateDataFrameAnalyticsConfig,
} from '@kbn/ml-data-frame-analytics-utils';

import { ML_INTERNAL_BASE_PATH } from '../../../../common/constants/app';
import type { HttpService } from '../http_service';
import { useMlKibana } from '../../contexts/kibana';

import type { ValidateAnalyticsJobResponse } from '../../../../common/constants/validation';
import type { DeepPartial } from '../../../../common/types/common';
import type { JobMessage } from '../../../../common/types/audit_message';
import type { PutDataFrameAnalyticsResponseSchema } from '../../../../server/routes/schemas/data_frame_analytics_schema';

export interface GetDataFrameAnalyticsStatsResponseOk {
  node_failures?: object;
  count: number;
  data_frame_analytics: DataFrameAnalyticsStats[];
}

export interface GetDataFrameAnalyticsStatsResponseError {
  statusCode: number;
  error: string;
  message: string;
}

export type GetDataFrameAnalyticsStatsResponse =
  | GetDataFrameAnalyticsStatsResponseOk
  | GetDataFrameAnalyticsStatsResponseError;

export interface GetDataFrameAnalyticsResponse {
  count: number;
  data_frame_analytics: DataFrameAnalyticsConfig[];
}

export interface DeleteDataFrameAnalyticsWithIndexResponse {
  acknowledged: boolean;
  analyticsJobDeleted: DeleteDataFrameAnalyticsWithIndexStatus;
  destIndexDeleted: DeleteDataFrameAnalyticsWithIndexStatus;
  destDataViewDeleted: DeleteDataFrameAnalyticsWithIndexStatus;
}

export interface JobsExistsResponse {
  [jobId: string]: { exists: boolean };
}

export const dataFrameAnalyticsApiProvider = (httpService: HttpService) => ({
  getDataFrameAnalytics(analyticsId?: string, excludeGenerated?: boolean, size?: number) {
    const analyticsIdString = analyticsId !== undefined ? `/${analyticsId}` : '';
    return httpService.http<GetDataFrameAnalyticsResponse>({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics${analyticsIdString}`,
      method: 'GET',
      ...(excludeGenerated ? { query: { excludeGenerated, size } } : {}),
      version: '1',
    });
  },
  getDataFrameAnalyticsStats(analyticsId?: string) {
    if (analyticsId !== undefined) {
      return httpService.http<GetDataFrameAnalyticsStatsResponse>({
        path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/${analyticsId}/_stats`,
        method: 'GET',
        version: '1',
      });
    }

    return httpService.http<GetDataFrameAnalyticsStatsResponse>({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/_stats`,
      method: 'GET',
      version: '1',
    });
  },
  createDataFrameAnalytics(
    analyticsId: string,
    analyticsConfig: DeepPartial<DataFrameAnalyticsConfig>,
    createDataView: boolean = false,
    timeFieldName?: string
  ) {
    const body = JSON.stringify(analyticsConfig);
    return httpService.http<PutDataFrameAnalyticsResponseSchema>({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/${analyticsId}`,
      method: 'PUT',
      query: { createDataView, timeFieldName },
      body,
      version: '1',
    });
  },
  updateDataFrameAnalytics(analyticsId: string, updateConfig: UpdateDataFrameAnalyticsConfig) {
    const body = JSON.stringify(updateConfig);
    return httpService.http<any>({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/${analyticsId}/_update`,
      method: 'POST',
      body,
      version: '1',
    });
  },
  getDataFrameAnalyticsMap(
    id: string,
    treatAsRoot: boolean,
    type?: string
  ): Promise<AnalyticsMapReturnType> {
    const idString = id !== undefined ? `/${id}` : '';
    return httpService.http({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/map${idString}`,
      method: 'GET',
      query: { treatAsRoot, type },
      version: '1',
    });
  },
  jobsExist(analyticsIds: string[], allSpaces: boolean = false) {
    const body = JSON.stringify({ analyticsIds, allSpaces });
    return httpService.http<JobsExistsResponse>({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/jobs_exist`,
      method: 'POST',
      body,
      version: '1',
    });
  },
  evaluateDataFrameAnalytics(evaluateConfig: any) {
    const body = JSON.stringify(evaluateConfig);
    return httpService.http<any>({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/_evaluate`,
      method: 'POST',
      body,
      version: '1',
    });
  },
  explainDataFrameAnalytics(jobConfig: DeepPartial<DataFrameAnalyticsConfig>) {
    const body = JSON.stringify(jobConfig);
    return httpService.http<any>({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/_explain`,
      method: 'POST',
      body,
      version: '1',
    });
  },
  deleteDataFrameAnalytics(analyticsId: string, force: boolean = true) {
    return httpService.http<any>({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/${analyticsId}`,
      query: { force },
      method: 'DELETE',
      version: '1',
    });
  },
  deleteDataFrameAnalyticsAndDestIndex(
    analyticsId: string,
    deleteDestIndex: boolean,
    deleteDestDataView: boolean,
    force: boolean = true
  ) {
    return httpService.http<DeleteDataFrameAnalyticsWithIndexResponse>({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/${analyticsId}`,
      query: { deleteDestIndex, deleteDestDataView, force },
      method: 'DELETE',
      version: '1',
    });
  },
  startDataFrameAnalytics(analyticsId: string) {
    return httpService.http<any>({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/${analyticsId}/_start`,
      method: 'POST',
      version: '1',
    });
  },
  stopDataFrameAnalytics(analyticsId: string, force: boolean = false) {
    return httpService.http<any>({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/${analyticsId}/_stop`,
      method: 'POST',
      query: { force },
      version: '1',
    });
  },
  getAnalyticsAuditMessages(analyticsId: string) {
    return httpService.http<JobMessage[]>({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/${analyticsId}/messages`,
      method: 'GET',
      version: '1',
    });
  },
  validateDataFrameAnalytics(analyticsConfig: DeepPartial<DataFrameAnalyticsConfig>) {
    const body = JSON.stringify(analyticsConfig);
    return httpService.http<ValidateAnalyticsJobResponse>({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/validate`,
      method: 'POST',
      body,
      version: '1',
    });
  },
  newJobCapsAnalytics(indexPatternTitle: string, isRollup: boolean = false) {
    const query = isRollup === true ? { rollup: true } : {};
    return httpService.http<NewJobCapsResponse>({
      path: `${ML_INTERNAL_BASE_PATH}/data_frame/analytics/new_job_caps/${indexPatternTitle}`,
      method: 'GET',
      query,
      version: '1',
    });
  },
});

export type DataFrameAnalyticsApiService = ReturnType<typeof dataFrameAnalyticsApiProvider>;

/**
 * Hooks for accessing {@link DataFrameAnalyticsApiService} in React components.
 */
export function useDataFrameAnalyticsApiService(): DataFrameAnalyticsApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => dataFrameAnalyticsApiProvider(httpService), [httpService]);
}
