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
    const sBody = typeof body === 'string' ? body : JSON.stringify(body);
    const bytes = result?.request?.headers?.['Content-Length'] || Buffer.byteLength(sBody, 'utf8');
    this.metrics.requestBodyBytes = this.metrics.requestBodyBytes + bytes;
  }

  public getRequestBodyByte() {
    return this.metrics.requestBodyBytes;
  }
}
