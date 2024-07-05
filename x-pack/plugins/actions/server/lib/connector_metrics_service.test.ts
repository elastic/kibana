/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorMetricsService } from '../types';
import { AxiosHeaders, AxiosResponse } from 'axios';

describe('ConnectorMetricsService', () => {
  test('it collects requestBodyBytes from response.request.headers', async () => {
    const connectorMetricsService = new ConnectorMetricsService();
    const data = { test: 'foo' };
    const contentLength = Buffer.byteLength(JSON.stringify(data), 'utf8');

    const axiosResponse: AxiosResponse = {
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: new AxiosHeaders() },
      request: {
        headers: { 'Content-Length': contentLength },
      },
    };

    connectorMetricsService.addRequestBodyBytes(axiosResponse, data);

    expect(connectorMetricsService.getRequestBodyByte()).toBe(contentLength);

    connectorMetricsService.addRequestBodyBytes(axiosResponse, data);

    expect(connectorMetricsService.getRequestBodyByte()).toBe(contentLength + contentLength);
  });
  test('it collects requestBodyBytes from data when response.request.headers is missing', async () => {
    const connectorMetricsService = new ConnectorMetricsService();
    const data = { test: 'foo' };
    const contentLength = Buffer.byteLength(JSON.stringify(data), 'utf8');

    const axiosResponse: AxiosResponse = {
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };

    connectorMetricsService.addRequestBodyBytes(axiosResponse, data);

    expect(connectorMetricsService.getRequestBodyByte()).toBe(contentLength);

    connectorMetricsService.addRequestBodyBytes(axiosResponse, data);

    expect(connectorMetricsService.getRequestBodyByte()).toBe(contentLength + contentLength);
  });
});
