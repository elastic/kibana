/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { http } from '../http_service';

import { basePath } from './index';
import { DataFrameAnalyticsStats } from '../../data_frame_analytics/pages/analytics_management/components/analytics_list/common';
import {
  DataFrameAnalyticsConfig,
  UpdateDataFrameAnalyticsConfig,
} from '../../data_frame_analytics/common';
import { DeepPartial } from '../../../../common/types/common';
import {
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
  results: {
    [jobId: string]: boolean;
  };
}

export const dataFrameAnalytics = {
  getDataFrameAnalytics(analyticsId?: string, excludeGenerated?: boolean) {
    const analyticsIdString = analyticsId !== undefined ? `/${analyticsId}` : '';
    return http<GetDataFrameAnalyticsResponse>({
      path: `${basePath()}/data_frame/analytics${analyticsIdString}`,
      method: 'GET',
      ...(excludeGenerated ? { query: { excludeGenerated } } : {}),
    });
  },
  getDataFrameAnalyticsStats(analyticsId?: string) {
    if (analyticsId !== undefined) {
      return http<GetDataFrameAnalyticsStatsResponse>({
        path: `${basePath()}/data_frame/analytics/${analyticsId}/_stats`,
        method: 'GET',
      });
    }

    return http<GetDataFrameAnalyticsStatsResponse>({
      path: `${basePath()}/data_frame/analytics/_stats`,
      method: 'GET',
    });
  },
  createDataFrameAnalytics(
    analyticsId: string,
    analyticsConfig: DeepPartial<DataFrameAnalyticsConfig>
  ) {
    const body = JSON.stringify(analyticsConfig);
    return http<any>({
      path: `${basePath()}/data_frame/analytics/${analyticsId}`,
      method: 'PUT',
      body,
    });
  },
  updateDataFrameAnalytics(analyticsId: string, updateConfig: UpdateDataFrameAnalyticsConfig) {
    const body = JSON.stringify(updateConfig);
    return http<any>({
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
    return http({
      path: `${basePath()}/data_frame/analytics/map${idString}`,
      method: 'GET',
      query: { treatAsRoot, type },
    });
  },
  jobsExists(analyticsIds: string[], allSpaces: boolean = false) {
    const body = JSON.stringify({ analyticsIds, allSpaces });
    return http<JobsExistsResponse>({
      path: `${basePath()}/data_frame/analytics/jobs_exist`,
      method: 'POST',
      body,
    });
  },
  evaluateDataFrameAnalytics(evaluateConfig: any) {
    const body = JSON.stringify(evaluateConfig);
    return http<any>({
      path: `${basePath()}/data_frame/_evaluate`,
      method: 'POST',
      body,
    });
  },
  explainDataFrameAnalytics(jobConfig: DeepPartial<DataFrameAnalyticsConfig>) {
    const body = JSON.stringify(jobConfig);
    return http<any>({
      path: `${basePath()}/data_frame/analytics/_explain`,
      method: 'POST',
      body,
    });
  },
  deleteDataFrameAnalytics(analyticsId: string) {
    return http<any>({
      path: `${basePath()}/data_frame/analytics/${analyticsId}`,
      method: 'DELETE',
    });
  },
  deleteDataFrameAnalyticsAndDestIndex(
    analyticsId: string,
    deleteDestIndex: boolean,
    deleteDestIndexPattern: boolean
  ) {
    return http<DeleteDataFrameAnalyticsWithIndexResponse>({
      path: `${basePath()}/data_frame/analytics/${analyticsId}`,
      query: { deleteDestIndex, deleteDestIndexPattern },
      method: 'DELETE',
    });
  },
  startDataFrameAnalytics(analyticsId: string) {
    return http<any>({
      path: `${basePath()}/data_frame/analytics/${analyticsId}/_start`,
      method: 'POST',
    });
  },
  stopDataFrameAnalytics(analyticsId: string, force: boolean = false) {
    return http<any>({
      path: `${basePath()}/data_frame/analytics/${analyticsId}/_stop`,
      method: 'POST',
      query: { force },
    });
  },
  getAnalyticsAuditMessages(analyticsId: string) {
    return http<any>({
      path: `${basePath()}/data_frame/analytics/${analyticsId}/messages`,
      method: 'GET',
    });
  },
};
