/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpSetup } from 'src/core/public';

import { API_BASE_PATH } from '../../../common/constants';
import { Pipeline } from '../../../common/types';
import {
  UseRequestConfig,
  sendRequest as _sendRequest,
  useRequest as _useRequest,
} from '../../shared_imports';

export class ApiService {
  private client: HttpSetup | undefined;

  private useRequest<R = any, E = Error>(config: UseRequestConfig) {
    if (!this.client) {
      throw new Error('Api service has not be initialized.');
    }
    return _useRequest<R, E>(this.client, config);
  }

  public setup(httpClient: HttpSetup): void {
    this.client = httpClient;
  }

  public useLoadPipelines() {
    return this.useRequest<Pipeline[]>({
      path: API_BASE_PATH,
      method: 'get',
    });
  }
}

export const apiService = new ApiService();
