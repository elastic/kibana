/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-data-access-plugin/common';
import { DATASTREAM_DATASET } from '@kbn/metrics-data-access-plugin/common';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getServiceCallGraph, SERVICE_CALL_GRAPH_WINDOW_MS } from './get_service_call_graph';
import type { IEnvOptions } from './get_service_map';

type SearchMock = jest.Mock<Promise<unknown>>;

const END = 1_700_000_900_000;

function makeOptions(
  overrides: Partial<Pick<IEnvOptions, 'apmEventClient' | 'environment' | 'serviceGroupKuery'>> = {}
) {
  return {
    apmEventClient: {} as APMEventClient,
    environment: 'production',
    end: END,
    serviceGroupKuery: undefined,
    ...overrides,
  };
}

interface CallBucket {
  key: { service?: string; destination?: string };
  doc_count: number;
  calls?: { value: number | null };
}

function callResponse(buckets: CallBucket[], afterKey?: { service: string; destination: string }) {
  return {
    aggregations: {
      calls: {
        buckets,
        ...(afterKey ? { after_key: afterKey } : {}),
      },
    },
  };
}

function bucket(service: string, destination: string, calls: number, docCount = calls): CallBucket {
  return {
    key: { service, destination },
    doc_count: docCount,
    calls: { value: calls },
  };
}

interface CallGraphSearchParams {
  apm: { sources?: Array<{ documentType: string; rollupInterval?: string }> };
  query: { bool: { filter: unknown[] } };
  aggs: {
    calls: {
      composite: { size: number; after?: Record<string, unknown> };
    };
  };
}

function getSearchCall(search: SearchMock, callIndex: number) {
  const callArgs = search.mock.calls[callIndex];
  return {
    operationName: callArgs[0] as string,
    params: callArgs[1] as CallGraphSearchParams,
  };
}

const OTEL_ONE_MINUTE_DATASET = `service_destination.${RollupInterval.OneMinute}.otel`;
const APM_TEN_MINUTE_DATASET = `apm.service_destination.${RollupInterval.TenMinutes}`;
const APM_ONE_MINUTE_DATASET = `apm.service_destination.${RollupInterval.OneMinute}`;
const HOUR_MS = 60 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;

function rollupIntervalOf(params: CallGraphSearchParams) {
  return params.apm.sources?.[0].rollupInterval;
}

function rangeStartOf(params: CallGraphSearchParams): number | undefined {
  for (const filter of params.query.bool.filter) {
    if (typeof filter !== 'object' || filter === null || !('range' in filter)) {
      continue;
    }
    const timestamp = (filter as { range: { '@timestamp'?: { gte?: number } } }).range[
      '@timestamp'
    ];
    return timestamp?.gte;
  }
  return undefined;
}

function datasetOf(params: CallGraphSearchParams): string | undefined {
  for (const filter of params.query.bool.filter) {
    if (typeof filter !== 'object' || filter === null || !('term' in filter)) {
      continue;
    }
    const dataset = (filter as { term: Record<string, unknown> }).term[DATASTREAM_DATASET];
    if (typeof dataset === 'string') {
      return dataset;
    }
  }
  return undefined;
}

describe('getServiceCallGraph', () => {
  it('reads 1 minute OpenTelemetry calls when the 60 minute rollup has data', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(callResponse([bucket('cart', 'payment', 12)]))
      .mockResolvedValue(callResponse([]));
    const graph = await getServiceCallGraph(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(search).toHaveBeenCalledTimes(4);
    const call = getSearchCall(search, 0);
    expect(call.operationName).toBe('get_service_call_graph_for_service_map');
    expect(call.params.apm.sources?.[0]).toEqual({
      documentType: ApmDocumentType.ServiceDestinationMetric,
      rollupInterval: RollupInterval.SixtyMinutes,
    });
    expect(datasetOf(call.params)).toBeUndefined();
    expect(rangeStartOf(call.params)).toBe(END - SERVICE_CALL_GRAPH_WINDOW_MS);

    const otelCall = getSearchCall(search, 1);
    expect(rollupIntervalOf(otelCall.params)).toBe(RollupInterval.OneMinute);
    expect(datasetOf(otelCall.params)).toBe(OTEL_ONE_MINUTE_DATASET);
    expect(rangeStartOf(otelCall.params)).toBe(END - SERVICE_CALL_GRAPH_WINDOW_MS);

    const recentTenMinutes = getSearchCall(search, 2);
    expect(rollupIntervalOf(recentTenMinutes.params)).toBe(RollupInterval.TenMinutes);
    expect(datasetOf(recentTenMinutes.params)).toBe(APM_TEN_MINUTE_DATASET);
    expect(rangeStartOf(recentTenMinutes.params)).toBe(END - HOUR_MS);

    const recentMinute = getSearchCall(search, 3);
    expect(rollupIntervalOf(recentMinute.params)).toBe(RollupInterval.OneMinute);
    expect(datasetOf(recentMinute.params)).toBe(APM_ONE_MINUTE_DATASET);
    expect(rangeStartOf(recentMinute.params)).toBe(END - TEN_MINUTES_MS);
    expect(graph).toEqual({ cart: [{ destination: 'payment', calls: 12 }] });
  });

  it('falls through to the 1 minute rollup when the coarser ones are empty', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(callResponse([]))
      .mockResolvedValueOnce(callResponse([]))
      .mockResolvedValueOnce(callResponse([bucket('cart', 'payment', 3)]));

    const graph = await getServiceCallGraph(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(search).toHaveBeenCalledTimes(3);
    expect(getSearchCall(search, 0).params.apm.sources?.[0].rollupInterval).toBe(
      RollupInterval.SixtyMinutes
    );
    expect(getSearchCall(search, 1).params.apm.sources?.[0].rollupInterval).toBe(
      RollupInterval.TenMinutes
    );
    expect(getSearchCall(search, 2).params.apm.sources?.[0].rollupInterval).toBe(
      RollupInterval.OneMinute
    );
    expect(datasetOf(getSearchCall(search, 2).params)).toBeUndefined();
    expect(graph).toEqual({ cart: [{ destination: 'payment', calls: 3 }] });
  });

  it('keeps the 10 minute count when the 60 minute rollup has no such pair', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(callResponse([]))
      .mockResolvedValueOnce(callResponse([bucket('cart', 'payment', 8)]))
      .mockResolvedValueOnce(callResponse([]))
      .mockResolvedValueOnce(callResponse([bucket('cart', 'orders', 2)]));

    const graph = await getServiceCallGraph(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(search).toHaveBeenCalledTimes(4);
    expect(getSearchCall(search, 1).params.apm.sources?.[0].rollupInterval).toBe(
      RollupInterval.TenMinutes
    );
    expect(datasetOf(getSearchCall(search, 1).params)).toBeUndefined();
    expect(rollupIntervalOf(getSearchCall(search, 2).params)).toBe(RollupInterval.OneMinute);
    expect(datasetOf(getSearchCall(search, 2).params)).toBe(OTEL_ONE_MINUTE_DATASET);
    const recentMinute = getSearchCall(search, 3);
    expect(rollupIntervalOf(recentMinute.params)).toBe(RollupInterval.OneMinute);
    expect(datasetOf(recentMinute.params)).toBe(APM_ONE_MINUTE_DATASET);
    expect(rangeStartOf(recentMinute.params)).toBe(END - TEN_MINUTES_MS);
    expect(graph).toEqual({
      cart: [
        { destination: 'payment', calls: 8 },
        { destination: 'orders', calls: 2 },
      ],
    });
  });

  it('returns no calls when every rollup is empty', async () => {
    const search: SearchMock = jest.fn().mockResolvedValue(callResponse([]));

    const graph = await getServiceCallGraph(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(search).toHaveBeenCalledTimes(3);
    expect(graph).toEqual({});
  });

  it('uses the summed call count, and the document count when the sum is missing', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(
        callResponse([
          bucket('cart', 'payment', 40, 2),
          {
            key: { service: 'cart', destination: 'shipping' },
            doc_count: 7,
            calls: { value: null },
          },
          { key: { service: 'cart' }, doc_count: 1, calls: { value: 1 } },
        ])
      )
      .mockResolvedValue(callResponse([]));

    const graph = await getServiceCallGraph(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(graph).toEqual({
      cart: [
        { destination: 'payment', calls: 40 },
        { destination: 'shipping', calls: 7 },
      ],
    });
  });

  it('returns every pair from a later page', async () => {
    const search: SearchMock = jest
      .fn()
      .mockImplementation(async (_name, params: CallGraphSearchParams) => {
        if (rollupIntervalOf(params) !== RollupInterval.SixtyMinutes) {
          return callResponse([]);
        }
        const size = params.aggs.calls.composite.size;
        if (!params.aggs.calls.composite.after) {
          return callResponse(
            Array.from({ length: size }, (_, index) => bucket(`service-${index}`, 'payment', 1)),
            { service: 'next', destination: 'next' }
          );
        }
        return callResponse([bucket('service-last', 'shipping', 4)]);
      });

    const graph = await getServiceCallGraph(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(search).toHaveBeenCalledTimes(5);
    expect(getSearchCall(search, 1).params.aggs.calls.composite.after).toEqual({
      service: 'next',
      destination: 'next',
    });
    expect(graph['service-0']).toEqual([{ destination: 'payment', calls: 1 }]);
    expect(graph['service-last']).toEqual([{ destination: 'shipping', calls: 4 }]);
    expect(Object.keys(graph)).toHaveLength(
      getSearchCall(search, 0).params.aggs.calls.composite.size + 1
    );
  });

  it('keeps at most 1000 destinations for one service', async () => {
    const search: SearchMock = jest
      .fn()
      .mockImplementation(async (_name, params: CallGraphSearchParams) => {
        if (rollupIntervalOf(params) !== RollupInterval.SixtyMinutes) {
          return callResponse([]);
        }
        const size = params.aggs.calls.composite.size;
        if (!params.aggs.calls.composite.after) {
          return callResponse(
            Array.from({ length: size }, (_, index) =>
              bucket('gateway', `dest-${index}`, index + 1)
            ),
            { service: 'gateway', destination: 'next' }
          );
        }
        return callResponse([bucket('gateway', 'dest-extra', 9)]);
      });

    const graph = await getServiceCallGraph(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(graph.gateway).toHaveLength(1000);
    expect(graph.gateway[0]).toEqual({ destination: 'dest-0', calls: 1 });
    expect(graph.gateway.some((call) => call.destination === 'dest-1000')).toBe(false);
    expect(graph.gateway.some((call) => call.destination === 'dest-extra')).toBe(false);
  });

  it('stops after 50 full pages', async () => {
    const search: SearchMock = jest
      .fn()
      .mockImplementation(async (_name, params: CallGraphSearchParams) => {
        if (rollupIntervalOf(params) !== RollupInterval.SixtyMinutes) {
          return callResponse([]);
        }
        const size = params.aggs.calls.composite.size;
        const page = search.mock.calls.length;
        return callResponse(
          Array.from({ length: size }, (_, index) =>
            bucket(`service-${page}-${index}`, 'payment', 1)
          ),
          { service: 'next', destination: 'next' }
        );
      });

    await getServiceCallGraph(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    const sixtyMinuteCalls = search.mock.calls.filter(
      (call) => rollupIntervalOf(call[1] as CallGraphSearchParams) === RollupInterval.SixtyMinutes
    );
    expect(sixtyMinuteCalls).toHaveLength(50);
    expect(search).toHaveBeenCalledTimes(53);
  });

  it('filters on the environment and the service group, over the day ending at the map range', async () => {
    const serviceGroupKuery = 'service.name: "checkout"';
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(callResponse([bucket('checkout', 'payment', 1)]))
      .mockResolvedValue(callResponse([]));

    await getServiceCallGraph(
      makeOptions({
        apmEventClient: { search } as unknown as APMEventClient,
        environment: 'production',
        serviceGroupKuery,
      })
    );

    expect(getSearchCall(search, 0).params.query.bool.filter).toEqual([
      ...rangeQuery(END - SERVICE_CALL_GRAPH_WINDOW_MS, END),
      ...environmentQuery('production'),
      ...kqlQuery(serviceGroupKuery),
    ]);
  });

  it('leaves the service group out when the map is not scoped to one', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(callResponse([bucket('cart', 'payment', 1)]))
      .mockResolvedValue(callResponse([]));

    await getServiceCallGraph(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(getSearchCall(search, 0).params.query.bool.filter).toEqual([
      ...rangeQuery(END - SERVICE_CALL_GRAPH_WINDOW_MS, END),
      ...environmentQuery('production'),
    ]);
  });

  it('keeps a service whose name is an object property', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(
        callResponse([
          bucket('constructor', 'cart', 3),
          bucket('toString', 'cart', 2),
          bucket('__proto__', 'cart', 1),
        ])
      )
      .mockResolvedValue(callResponse([]));

    const graph = await getServiceCallGraph(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(graph.constructor).toEqual([{ destination: 'cart', calls: 3 }]);
    expect(graph.toString).toEqual([{ destination: 'cart', calls: 2 }]);
    expect(graph.__proto__).toEqual([{ destination: 'cart', calls: 1 }]);
    expect(Object.getPrototypeOf(graph)).toBeNull();
  });

  it('adds an OpenTelemetry destination without summing a pair the coarse rollup already counted', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(callResponse([bucket('cart', 'payment', 100)]))
      .mockResolvedValueOnce(
        callResponse([bucket('cart', 'payment', 80), bucket('cart', 'orders', 5)])
      )
      .mockResolvedValue(callResponse([]));

    const graph = await getServiceCallGraph(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(datasetOf(getSearchCall(search, 1).params)).toBe(OTEL_ONE_MINUTE_DATASET);
    expect(graph).toEqual({
      cart: [
        { destination: 'payment', calls: 100 },
        { destination: 'orders', calls: 5 },
      ],
    });
  });

  it('adds an APM destination the coarse rollup has not caught up to, without summing a known pair', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(callResponse([bucket('cart', 'payment', 100)]))
      .mockResolvedValueOnce(callResponse([]))
      .mockResolvedValueOnce(
        callResponse([bucket('cart', 'payment', 30), bucket('cart', 'orders', 4)])
      )
      .mockResolvedValueOnce(callResponse([bucket('cart', 'shipping', 2)]));

    const graph = await getServiceCallGraph(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(datasetOf(getSearchCall(search, 2).params)).toBe(APM_TEN_MINUTE_DATASET);
    expect(rangeStartOf(getSearchCall(search, 2).params)).toBe(END - HOUR_MS);
    expect(graph).toEqual({
      cart: [
        { destination: 'payment', calls: 100 },
        { destination: 'orders', calls: 4 },
        { destination: 'shipping', calls: 2 },
      ],
    });
  });

  it('does not add a finer destination once a service already has 1000', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(
        callResponse(
          Array.from({ length: 1000 }, (_, index) => bucket('gateway', `dest-${index}`, 1))
        )
      )
      .mockResolvedValueOnce(callResponse([bucket('gateway', 'otel-only', 9)]))
      .mockResolvedValue(callResponse([]));

    const graph = await getServiceCallGraph(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(graph.gateway).toHaveLength(1000);
    expect(graph.gateway.some((call) => call.destination === 'otel-only')).toBe(false);
  });

  it('rejects when the search fails, without trying a finer rollup', async () => {
    const search: SearchMock = jest.fn().mockRejectedValueOnce(new Error('search failed'));

    await expect(
      getServiceCallGraph(makeOptions({ apmEventClient: { search } as unknown as APMEventClient }))
    ).rejects.toThrow('search failed');
    expect(search).toHaveBeenCalledTimes(1);
  });
});
