/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { HttpService } from '../http_service';
import { useMlKibana } from '../../contexts/kibana';

import { basePath } from '.';
import type { DataFrameAnalyticsStats } from '../../data_frame_analytics/pages/analytics_management/components/analytics_list/common';
import type { ValidateAnalyticsJobResponse } from '../../../../common/constants/validation';
import type { DataFrameAnalyticsConfig } from '../../data_frame_analytics/common';
import type { DeepPartial } from '../../../../common/types/common';
import type { NewJobCapsResponse } from '../../../../common/types/fields';
import type { UpdateDataFrameAnalyticsConfig } from '../../../../common/types/data_frame_analytics';
import type { JobMessage } from '../../../../common/types/audit_message';
import type {
  DeleteDataFrameAnalyticsWithIndexStatus,
  AnalyticsMapReturnType,
} from '../../../../common/types/data_frame_analytics';

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
  destIndexPatternDeleted: DeleteDataFrameAnalyticsWithIndexStatus;
}

export interface JobsExistsResponse {
  [jobId: string]: { exists: boolean };
}

export const dataFrameAnalyticsApiProvider = (httpService: HttpService) => ({
  getDataFrameAnalytics(analyticsId?: string, excludeGenerated?: boolean, size?: number) {
    const analyticsIdString = analyticsId !== undefined ? `/${analyticsId}` : '';
    return httpService.http<GetDataFrameAnalyticsResponse>({
      path: `${basePath()}/data_frame/analytics${analyticsIdString}`,
      method: 'GET',
      ...(excludeGenerated ? { query: { excludeGenerated, size } } : {}),
    });
  },
  getDataFrameAnalyticsStats(analyticsId?: string) {
    if (analyticsId !== undefined) {
      return httpService.http<GetDataFrameAnalyticsStatsResponse>({
        path: `${basePath()}/data_frame/analytics/${analyticsId}/_stats`,
        method: 'GET',
      });
    }

    return httpService.http<GetDataFrameAnalyticsStatsResponse>({
      path: `${basePath()}/data_frame/analytics/_stats`,
      method: 'GET',
    });
  },
  createDataFrameAnalytics(
    analyticsId: string,
    analyticsConfig: DeepPartial<DataFrameAnalyticsConfig>
  ) {
    const body = JSON.stringify(analyticsConfig);
    return httpService.http<any>({
      path: `${basePath()}/data_frame/analytics/${analyticsId}`,
      method: 'PUT',
      body,
    });
  },
  updateDataFrameAnalytics(analyticsId: string, updateConfig: UpdateDataFrameAnalyticsConfig) {
    const body = JSON.stringify(updateConfig);
    return httpService.http<any>({
      path: `${basePath()}/data_frame/analytics/${analyticsId}/_update`,
      method: 'POST',
      body,
    });
  },
  getDataFrameAnalyticsMap(
    id: string,
    treatAsRoot: boolean,
    type?: string
  ): Promise<AnalyticsMapReturnType> {
    const idString = id !== undefined ? `/${id}` : '';
    return httpService.http({
      path: `${basePath()}/data_frame/analytics/map${idString}`,
      method: 'GET',
      query: { treatAsRoot, type },
    });
  },
  jobsExist(analyticsIds: string[], allSpaces: boolean = false) {
    const body = JSON.stringify({ analyticsIds, allSpaces });
    return httpService.http<JobsExistsResponse>({
      path: `${basePath()}/data_frame/analytics/jobs_exist`,
      method: 'POST',
      body,
    });
  },
  evaluateDataFrameAnalytics(evaluateConfig: any) {
    const body = JSON.stringify(evaluateConfig);
    return httpService.http<any>({
      path: `${basePath()}/data_frame/_evaluate`,
      method: 'POST',
      body,
    });
  },
  explainDataFrameAnalytics(jobConfig: DeepPartial<DataFrameAnalyticsConfig>) {
    const body = JSON.stringify(jobConfig);
    return httpService.http<any>({
      path: `${basePath()}/data_frame/analytics/_explain`,
      method: 'POST',
      body,
    });
  },
  deleteDataFrameAnalytics(analyticsId: string) {
    return httpService.http<any>({
      path: `${basePath()}/data_frame/analytics/${analyticsId}`,
      method: 'DELETE',
    });
  },
  deleteDataFrameAnalyticsAndDestIndex(
    analyticsId: string,
    deleteDestIndex: boolean,
    deleteDestIndexPattern: boolean
  ) {
    return httpService.http<DeleteDataFrameAnalyticsWithIndexResponse>({
      path: `${basePath()}/data_frame/analytics/${analyticsId}`,
      query: { deleteDestIndex, deleteDestIndexPattern },
      method: 'DELETE',
    });
  },
  startDataFrameAnalytics(analyticsId: string) {
    return httpService.http<any>({
      path: `${basePath()}/data_frame/analytics/${analyticsId}/_start`,
      method: 'POST',
    });
  },
  stopDataFrameAnalytics(analyticsId: string, force: boolean = false) {
    return httpService.http<any>({
      path: `${basePath()}/data_frame/analytics/${analyticsId}/_stop`,
      method: 'POST',
      query: { force },
    });
  },
  getAnalyticsAuditMessages(analyticsId: string) {
    return httpService.http<JobMessage[]>({
      path: `${basePath()}/data_frame/analytics/${analyticsId}/messages`,
      method: 'GET',
    });
  },
  validateDataFrameAnalytics(analyticsConfig: DeepPartial<DataFrameAnalyticsConfig>) {
    const body = JSON.stringify(analyticsConfig);
    return httpService.http<ValidateAnalyticsJobResponse>({
      path: `${basePath()}/data_frame/analytics/validate`,
      method: 'POST',
      body,
    });
  },
  newJobCapsAnalytics(indexPatternTitle: string, isRollup: boolean = false) {
    const query = isRollup === true ? { rollup: true } : {};
    return httpService.http<NewJobCapsResponse>({
      path: `${basePath()}/data_frame/analytics/new_job_caps/${indexPatternTitle}`,
      method: 'GET',
      query,
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
