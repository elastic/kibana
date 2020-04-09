/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpSetup } from 'src/core/public';

import { Pipeline } from '../../../common/types';
import { API_BASE_PATH } from '../../../common/constants';
import { Pipeline } from '../../../common/types';
import {
  UseRequestConfig,
  SendRequestConfig,
  SendRequestResponse,
  sendRequest as _sendRequest,
  useRequest as _useRequest,
} from '../../shared_imports';
import { UiMetricService } from './ui_metric';
import { UIM_PIPELINE_CREATE } from '../constants';

export class ApiService {
  private client: HttpSetup | undefined;
  private uiMetricService: UiMetricService | undefined;

  private useRequest<R = any, E = Error>(config: UseRequestConfig) {
    if (!this.client) {
      throw new Error('Api service has not be initialized.');
    }
    return _useRequest<R, E>(this.client, config);
  }

  private sendRequest(config: SendRequestConfig): Promise<SendRequestResponse> {
    if (!this.client) {
      throw new Error('Api service has not be initialized.');
    }
    return _sendRequest(this.client, config);
  }

  private trackUiMetric(eventName: string) {
    if (!this.uiMetricService) {
      throw new Error('UI metric service has not be initialized.');
    }
    return this.uiMetricService.trackUiMetric(eventName);
  }

  public setup(httpClient: HttpSetup, uiMetricService: UiMetricService): void {
    this.client = httpClient;
    this.uiMetricService = uiMetricService;
  }

  public useLoadPipelines() {
    return this.useRequest<Pipeline[]>({
      path: API_BASE_PATH,
      method: 'get',
    });
  }

  public async createPipeline(pipeline: Pipeline) {
    const result = await this.sendRequest({
      path: API_BASE_PATH,
      method: 'put',
      body: JSON.stringify(pipeline),
    });

    this.trackUiMetric(UIM_PIPELINE_CREATE);

    return result;
  }
}

export const apiService = new ApiService();
