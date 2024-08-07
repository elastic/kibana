/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorMetricsCollector } from '../types';
import { AxiosHeaders, AxiosResponse } from 'axios';
import { loggingSystemMock } from '@kbn/core/server/mocks';

describe('ConnectorMetricsCollector', () => {
  const logger = loggingSystemMock.createLogger();

  test('it collects requestBodyBytes from response.request.headers', async () => {
    const connectorMetricsCollector = new ConnectorMetricsCollector({
      logger,
      connectorId: 'test-connector-id',
    });
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
        getHeader: () => contentLength,
      },
    };

    connectorMetricsCollector.addRequestBodyBytes(axiosResponse, data);

    expect(connectorMetricsCollector.getRequestBodyByte()).toBe(contentLength);

    connectorMetricsCollector.addRequestBodyBytes(axiosResponse, data);

    expect(connectorMetricsCollector.getRequestBodyByte()).toBe(contentLength + contentLength);
  });
  test('it collects requestBodyBytes from data when header is is missing', async () => {
    const connectorMetricsCollector = new ConnectorMetricsCollector({
      logger,
      connectorId: 'test-connector-id',
    });
    const data = { test: 'foo' };
    const contentLength = Buffer.byteLength(JSON.stringify(data), 'utf8');

    const axiosResponse: AxiosResponse = {
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: new AxiosHeaders() },
      request: {
        getHeader: () => undefined,
      },
    };

    connectorMetricsCollector.addRequestBodyBytes(axiosResponse, data);

    expect(connectorMetricsCollector.getRequestBodyByte()).toBe(contentLength);

    connectorMetricsCollector.addRequestBodyBytes(axiosResponse, data);

    expect(connectorMetricsCollector.getRequestBodyByte()).toBe(contentLength + contentLength);
  });

  test('it logs an error when the body cannot be stringified ', async () => {
    const connectorMetricsCollector = new ConnectorMetricsCollector({
      logger,
      connectorId: 'test-connector-id',
    });

    const data = {
      name: 'arun',
    };

    // @ts-ignore
    data.foo = data; // this is to force JSON.stringify to throw

    const axiosResponse: AxiosResponse = {
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: new AxiosHeaders() },
      request: {
        getHeader: () => undefined,
      },
    };

    connectorMetricsCollector.addRequestBodyBytes(axiosResponse, data);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Request body bytes couldn't be calculated, Error: ")
    );
  });
});
