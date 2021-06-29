/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'src/core/public';
import { UpgradeAssistantStatus } from '../../../common/types';
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

  public useLoadUpgradeStatus() {
    return this.useRequest<UpgradeAssistantStatus>({
      path: `${API_BASE_PATH}/status`,
      method: 'get',
    });
  }

  public async sendTelemetryData(telemetryData: { [tabName: string]: boolean }) {
    const result = await this.sendRequest({
      path: `${API_BASE_PATH}/stats/ui_open`,
      method: 'put',
      body: JSON.stringify(telemetryData),
    });

    return result;
  }

  public useLoadDeprecationLogging() {
    return this.useRequest<{ isEnabled: boolean }>({
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
}

export const apiService = new ApiService();
