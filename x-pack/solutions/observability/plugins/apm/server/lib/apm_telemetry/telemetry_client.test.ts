/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getTelemetryClient } from './telemetry_client';

describe('getTelemetryClient', () => {
  it('passes the abort signal to every ES call', async () => {
    const core = coreMock.createSetup();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    core.getStartServices.mockResolvedValue([
      { elasticsearch: { client: { asInternalUser: esClient } } },
      {},
      undefined,
    ] as any);
    const controller = new AbortController();

    const telemetryClient = await getTelemetryClient({ core, signal: controller.signal });
    const transportOptions = { meta: true, signal: controller.signal };

    esClient.search.mockResponse({} as any);
    await telemetryClient.search({
      index: 'traces-apm-*',
      size: 0,
      track_total_hits: false,
      timeout: '5m',
    });
    expect(esClient.search).toHaveBeenCalledWith(expect.anything(), transportOptions);

    esClient.indices.stats.mockResponse({} as any);
    await telemetryClient.indicesStats({ index: 'traces-apm-*' });
    expect(esClient.indices.stats).toHaveBeenCalledWith(expect.anything(), transportOptions);

    esClient.fieldCaps.mockResponse({} as any);
    await telemetryClient.fieldCaps({ index: 'traces-apm-*', fields: ['service.name'] });
    expect(esClient.fieldCaps).toHaveBeenCalledWith(expect.anything(), transportOptions);

    esClient.transport.request.mockResolvedValue({ body: {} });
    await telemetryClient.transportRequest({ path: '/_xpack/usage', method: 'get' });
    expect(esClient.transport.request).toHaveBeenCalledWith(expect.anything(), transportOptions);
  });
});
