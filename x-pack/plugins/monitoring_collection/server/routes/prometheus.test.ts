/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { registerV1PrometheusRoute } from './prometheus';
import { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { PrometheusExporter } from '../lib/prometheus_exporter';

describe('prometheus route', () => {
  it('forwards the request to the prometheus exporter', async () => {
    const router = httpServiceMock.createRouter();
    const prometheusExporter = { exportMetrics: jest.fn() } as unknown as PrometheusExporter;
    registerV1PrometheusRoute({ router, prometheusExporter });

    const [, handler] = router.get.mock.calls[0];

    const context = {};
    const req = { params: {} } as KibanaRequest;
    const factory: jest.Mocked<KibanaResponseFactory> = httpServerMock.createResponseFactory();

    await handler(context, req, factory);

    expect(prometheusExporter.exportMetrics).toHaveBeenCalledWith(factory);
  });
});
