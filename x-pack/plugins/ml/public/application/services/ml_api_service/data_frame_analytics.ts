/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { http } from '../http_service';

import { basePath } from './index';
import { DataFrameAnalyticsStats } from '../../data_frame_analytics/pages/analytics_management/components/analytics_list/common';
import {
  DataFrameAnalyticsConfig,
  UpdateDataFrameAnalyticsConfig,
} from '../../data_frame_analytics/common';
import { DeepPartial } from '../../../../common/types/common';
import { DeleteDataFrameAnalyticsWithIndexStatus } from '../../../../common/types/data_frame_analytics';

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

interface GetDataFrameAnalyticsResponse {
  count: number;
  data_frame_analytics: DataFrameAnalyticsConfig[];
}

interface DeleteDataFrameAnalyticsWithIndexResponse {
  acknowledged: boolean;
  analyticsJobDeleted: DeleteDataFrameAnalyticsWithIndexStatus;
  destIndexDeleted: DeleteDataFrameAnalyticsWithIndexStatus;
  destIndexPatternDeleted: DeleteDataFrameAnalyticsWithIndexStatus;
}

export const dataFrameAnalytics = {
  getDataFrameAnalytics(analyticsId?: string) {
    const analyticsIdString = analyticsId !== undefined ? `/${analyticsId}` : '';
    return http<GetDataFrameAnalyticsResponse>({
      path: `${basePath()}/data_frame/analytics${analyticsIdString}`,
      method: 'GET',
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
