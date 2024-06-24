/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosError, AxiosResponse } from 'axios';

interface ConnectorMetrics {
  requestBodyBytes: number;
}

export class ConnectorMetricsService {
  private metrics: ConnectorMetrics = {
    requestBodyBytes: 0,
  };

  public addRequestBodyBytes(result?: AxiosError | AxiosResponse, body: string | object = '') {
    this.metrics.requestBodyBytes = this.extractRequestBodyBytes(result, body);
  }

  public getRequestBodyByte() {
    return this.metrics.requestBodyBytes;
  }

  private extractRequestBodyBytes(result?: AxiosError | AxiosResponse, body: string | object = '') {
    const stringBody = typeof body === 'string' ? body : JSON.stringify(body);
    return result?.request?.headers?.['Content-Length'] || Buffer.byteLength(stringBody, 'utf8');
  }
}
