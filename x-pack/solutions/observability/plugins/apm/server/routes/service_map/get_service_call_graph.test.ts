/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-data-access-plugin/common';
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

describe('getServiceCallGraph', () => {
  it('uses the 60 minute rollup when it has data', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(callResponse([bucket('cart', 'payment', 12)]));
    const graph = await getServiceCallGraph(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(search).toHaveBeenCalledTimes(1);
    const call = getSearchCall(search, 0);
    expect(call.operationName).toBe('get_service_call_graph_for_service_map');
    expect(call.params.apm.sources?.[0]).toEqual({
      documentType: ApmDocumentType.ServiceDestinationMetric,
      rollupInterval: RollupInterval.SixtyMinutes,
    });
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
    expect(graph).toEqual({ cart: [{ destination: 'payment', calls: 3 }] });
  });

  it('keeps the 10 minute rollup when it is the coarsest with data', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(callResponse([]))
      .mockResolvedValueOnce(callResponse([bucket('cart', 'payment', 8)]));

    const graph = await getServiceCallGraph(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(search).toHaveBeenCalledTimes(2);
    expect(getSearchCall(search, 1).params.apm.sources?.[0].rollupInterval).toBe(
      RollupInterval.TenMinutes
    );
    expect(graph.cart[0].calls).toBe(8);
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
    const search: SearchMock = jest.fn().mockResolvedValueOnce(
      callResponse([
        bucket('cart', 'payment', 40, 2),
        {
          key: { service: 'cart', destination: 'shipping' },
          doc_count: 7,
          calls: { value: null },
        },
        { key: { service: 'cart' }, doc_count: 1, calls: { value: 1 } },
      ])
    );

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

    expect(search).toHaveBeenCalledTimes(2);
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

    expect(search).toHaveBeenCalledTimes(50);
  });

  it('filters on the environment and the service group, over the day ending at the map range', async () => {
    const serviceGroupKuery = 'service.name: "checkout"';
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(callResponse([bucket('checkout', 'payment', 1)]));

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
      .mockResolvedValueOnce(callResponse([bucket('cart', 'payment', 1)]));

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
      );

    const graph = await getServiceCallGraph(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(graph.constructor).toEqual([{ destination: 'cart', calls: 3 }]);
    expect(graph.toString).toEqual([{ destination: 'cart', calls: 2 }]);
    expect(graph.__proto__).toEqual([{ destination: 'cart', calls: 1 }]);
    expect(Object.getPrototypeOf(graph)).toBeNull();
  });

  it('rejects when the search fails, without trying a finer rollup', async () => {
    const search: SearchMock = jest.fn().mockRejectedValueOnce(new Error('search failed'));

    await expect(
      getServiceCallGraph(makeOptions({ apmEventClient: { search } as unknown as APMEventClient }))
    ).rejects.toThrow('search failed');
    expect(search).toHaveBeenCalledTimes(1);
  });
});
