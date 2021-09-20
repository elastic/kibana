/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'src/core/public';
import { ESUpgradeStatus } from '../../../common/types';
import { API_BASE_PATH } from '../../../common/constants';
import {
  UseRequestConfig,
  SendRequestConfig,
  SendRequestResponse,
  sendRequest as _sendRequest,
  useRequest as _useRequest,
} from '../../shared_imports';

export interface ResponseError {
  statusCode: number;
  message: string | Error;
  attributes?: Record<string, any>;
}

export class ApiService {
  private client: HttpSetup | undefined;

  private useRequest<R = any, E = ResponseError>(config: UseRequestConfig) {
    if (!this.client) {
      throw new Error('API service has not be initialized.');
    }
    return _useRequest<R, E>(this.client, config);
  }

  private sendRequest<D = any, E = ResponseError>(
    config: SendRequestConfig
  ): Promise<SendRequestResponse<D, E>> {
    if (!this.client) {
      throw new Error('API service has not be initialized.');
    }
    return _sendRequest<D, E>(this.client, config);
  }

  public setup(httpClient: HttpSetup): void {
    this.client = httpClient;
  }

  public useLoadEsDeprecations() {
    return this.useRequest<ESUpgradeStatus>({
      path: `${API_BASE_PATH}/es_deprecations`,
      method: 'get',
    });
  }

  public async sendPageTelemetryData(telemetryData: { [tabName: string]: boolean }) {
    const result = await this.sendRequest({
      path: `${API_BASE_PATH}/stats/ui_open`,
      method: 'put',
      body: JSON.stringify(telemetryData),
    });

    return result;
  }

  public useLoadDeprecationLogging() {
    return this.useRequest<{
      isDeprecationLogIndexingEnabled: boolean;
      isDeprecationLoggingEnabled: boolean;
    }>({
      path: `${API_BASE_PATH}/deprecation_logging`,
      method: 'get',
    });
  }

  public async updateDeprecationLogging(loggingData: { isEnabled: boolean }) {
    const result = await this.sendRequest({
      path: `${API_BASE_PATH}/deprecation_logging`,
      method: 'put',
      body: JSON.stringify(loggingData),
    });

    return result;
  }

  public async updateIndexSettings(indexName: string, settings: string[]) {
    const result = await this.sendRequest({
      path: `${API_BASE_PATH}/${indexName}/index_settings`,
      method: 'post',
      body: {
        settings: JSON.stringify(settings),
      },
    });

    return result;
  }

  public async upgradeMlSnapshot(body: { jobId: string; snapshotId: string }) {
    const result = await this.sendRequest({
      path: `${API_BASE_PATH}/ml_snapshots`,
      method: 'post',
      body,
    });

    return result;
  }

  public async deleteMlSnapshot({ jobId, snapshotId }: { jobId: string; snapshotId: string }) {
    const result = await this.sendRequest({
      path: `${API_BASE_PATH}/ml_snapshots/${jobId}/${snapshotId}`,
      method: 'delete',
    });

    return result;
  }

  public async getMlSnapshotUpgradeStatus({
    jobId,
    snapshotId,
  }: {
    jobId: string;
    snapshotId: string;
  }) {
    return await this.sendRequest({
      path: `${API_BASE_PATH}/ml_snapshots/${jobId}/${snapshotId}`,
      method: 'get',
    });
  }

  public async sendReindexTelemetryData(telemetryData: { [key: string]: boolean }) {
    const result = await this.sendRequest({
      path: `${API_BASE_PATH}/stats/ui_reindex`,
      method: 'put',
      body: JSON.stringify(telemetryData),
    });

    return result;
  }

  public async getReindexStatus(indexName: string) {
    return await this.sendRequest({
      path: `${API_BASE_PATH}/reindex/${indexName}`,
      method: 'get',
    });
  }

  public async startReindexTask(indexName: string) {
    return await this.sendRequest({
      path: `${API_BASE_PATH}/reindex/${indexName}`,
      method: 'post',
    });
  }

  public async cancelReindexTask(indexName: string) {
    return await this.sendRequest({
      path: `${API_BASE_PATH}/reindex/${indexName}/cancel`,
      method: 'post',
    });
  }
}

export const apiService = new ApiService();
