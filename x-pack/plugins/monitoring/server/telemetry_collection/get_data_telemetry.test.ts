/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getDataTelemetry } from './get_data_telemetry';

function mockCallCluster(docs: any[] = []) {
  return jest.fn().mockImplementation(async (method: string, options) => {
    expect(method).toBe('search');
    // make sure we query for the fields we are after
    expect(options.filterPath).toContain('hits.hits._source.index_stats.index');
    expect(options.filterPath).toContain('hits.hits._source.index_stats.primaries.docs.count');
    expect(options.filterPath).toContain('hits.hits._source.index_stats.total.store.size_in_bytes');

    return { hits: { hits: docs.map((_source) => ({ _source })) } };
  });
}

describe('get_ingest_solutions', () => {
  test('it returns an empty document when no cluster UUIDs provided', async () => {
    await expect(
      getDataTelemetry(mockCallCluster(), [], Date.now(), Date.now(), 10)
    ).resolves.toStrictEqual({});
  });

  test('it returns the base document because no docs found', async () => {
    await expect(
      getDataTelemetry(mockCallCluster(), ['cluster-1', 'cluster-2'], Date.now(), Date.now(), 10)
    ).resolves.toStrictEqual({ 'cluster-1': {}, 'cluster-2': {} });
  });

  test('it counts 4 "logs.count" providers but 1 logs.total_providers', async () => {
    const indices = ['some_logs', 'some_logs_other', 'logs_app', 'logs'].map((index) => ({
      index_stats: {
        index,
        primaries: { docs: { count: 100 } },
        total: { store: { size_in_bytes: 10 } },
      },
    }));

    await expect(
      getDataTelemetry(mockCallCluster(indices), ['cluster-1'], Date.now(), Date.now(), 10)
    ).resolves.toStrictEqual({
      'cluster-1': {
        shippers: {
          logs: { index_count: 4, doc_count: 400, size_in_bytes: 40 },
        },
      },
    });
  });
});
