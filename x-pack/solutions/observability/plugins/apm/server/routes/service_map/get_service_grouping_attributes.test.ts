/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getServiceGroupingAttributes } from './get_service_grouping_attributes';
import type { IEnvOptions } from './get_service_map';

type SearchMock = jest.Mock<Promise<unknown>>;

const START = 1_700_000_000_000;
const END = 1_700_000_900_000;

function makeLogger() {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;
}

function makeOptions(
  overrides: Partial<
    IEnvOptions & {
      maxNumberOfServices: number;
    }
  > = {}
) {
  return {
    apmEventClient: {} as APMEventClient,
    environment: 'production',
    start: START,
    end: END,
    logger: makeLogger(),
    maxNumberOfServices: 5000,
    searchAggregatedTransactions: true,
    config: {} as IEnvOptions['config'],
    ...overrides,
  };
}

interface AttributeBucket {
  key: { service?: string };
  service_namespace?: { buckets: Array<{ key: string }> };
  kubernetes_namespace?: { buckets: Array<{ key: string }> };
}

function bucket(
  name: string,
  serviceNamespace?: string,
  kubernetesNamespace?: string
): AttributeBucket {
  return {
    key: { service: name },
    service_namespace: { buckets: serviceNamespace ? [{ key: serviceNamespace }] : [] },
    kubernetes_namespace: {
      buckets: kubernetesNamespace ? [{ key: kubernetesNamespace }] : [],
    },
  };
}

function page(buckets: AttributeBucket[], afterKey?: { service: string }) {
  return {
    aggregations: {
      services: {
        buckets,
        ...(afterKey ? { after_key: afterKey } : {}),
      },
    },
  };
}

interface AttributeSearchParams {
  apm: { events?: string[] };
  query: { bool: { filter: unknown[]; must_not?: unknown[] } };
  aggs: {
    services: {
      composite: { size: number; after?: Record<string, unknown> };
      aggs: {
        service_namespace: { terms: { field: string; size: number } };
        kubernetes_namespace: { terms: { field: string; size: number } };
      };
    };
  };
}

function getSearchCall(search: SearchMock, callIndex: number) {
  const callArgs = search.mock.calls[callIndex];
  return {
    operationName: callArgs[0] as string,
    params: callArgs[1] as AttributeSearchParams,
  };
}

describe('getServiceGroupingAttributes', () => {
  it('returns both namespaces of each service, and empty values when neither is set', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValue(
        page([
          bucket('checkout', 'shop', 'team-checkout'),
          bucket('ledger', undefined, 'team-payment'),
          bucket('legacy-batch'),
        ])
      );

    const attributes = await getServiceGroupingAttributes(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(attributes).toEqual({
      checkout: { serviceNamespace: 'shop', kubernetesNamespace: 'team-checkout' },
      ledger: { kubernetesNamespace: 'team-payment' },
      'legacy-batch': {},
    });
    expect(Object.getPrototypeOf(attributes)).toBeNull();
  });

  it('reads transaction events over the map range with the map filters', async () => {
    const serviceGroupKuery = 'service.name: "checkout"';
    const kuery = 'agent.name: "java"';
    const search: SearchMock = jest
      .fn()
      .mockResolvedValue(page([bucket('checkout', 'shop', 'team-checkout')]));

    await getServiceGroupingAttributes(
      makeOptions({
        apmEventClient: { search } as unknown as APMEventClient,
        serviceGroupKuery,
        kuery,
      })
    );

    const call = getSearchCall(search, 0);
    expect(call.operationName).toBe('get_service_grouping_attributes_for_service_map');
    expect(call.params.apm.events).toEqual([ProcessorEvent.transaction]);
    expect(call.params.query.bool.filter).toEqual([
      ...rangeQuery(START, END),
      ...environmentQuery('production'),
      ...kqlQuery(serviceGroupKuery),
      ...kqlQuery(kuery),
    ]);
    expect(call.params.aggs.services.aggs.service_namespace.terms).toEqual({
      field: 'service.namespace',
      size: 1,
    });
    expect(call.params.aggs.services.aggs.kubernetes_namespace.terms).toEqual({
      field: 'kubernetes.namespace',
      size: 1,
    });
  });

  it('reads services in pages until a short page', async () => {
    const full = Array.from({ length: 1000 }, (_, index) =>
      bucket(`svc-${index}`, undefined, 'ns')
    );
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(page(full, { service: 'svc-999' }))
      .mockResolvedValueOnce(page([bucket('last', undefined, 'ns')]));

    const attributes = await getServiceGroupingAttributes(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(search).toHaveBeenCalledTimes(2);
    expect(getSearchCall(search, 1).params.aggs.services.composite.after).toEqual({
      service: 'svc-999',
    });
    expect(attributes['svc-0']).toEqual({ kubernetesNamespace: 'ns' });
    expect(attributes.last).toEqual({ kubernetesNamespace: 'ns' });
    expect(Object.keys(attributes)).toHaveLength(1001);
  });

  it('stops at the map service limit', async () => {
    const search: SearchMock = jest.fn().mockResolvedValue(
      page(
        Array.from({ length: 1000 }, (_, index) => bucket(`svc-${index}`, 'shop')),
        { service: 'svc-999' }
      )
    );

    const attributes = await getServiceGroupingAttributes(
      makeOptions({
        apmEventClient: { search } as unknown as APMEventClient,
        maxNumberOfServices: 3,
      })
    );

    expect(search).toHaveBeenCalledTimes(1);
    expect(Object.keys(attributes)).toEqual(['svc-0', 'svc-1', 'svc-2']);
  });

  it('keeps a service whose name is an object property', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValue(
        page([
          bucket('constructor', 'shop'),
          bucket('toString', undefined, 'team-a'),
          bucket('__proto__'),
        ])
      );

    const attributes = await getServiceGroupingAttributes(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(attributes.constructor).toEqual({ serviceNamespace: 'shop' });
    expect(attributes.toString).toEqual({ kubernetesNamespace: 'team-a' });
    expect(attributes.__proto__).toEqual({});
  });

  it('rejects when the search fails', async () => {
    const search: SearchMock = jest.fn().mockRejectedValue(new Error('search failed'));

    await expect(
      getServiceGroupingAttributes(
        makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
      )
    ).rejects.toThrow('search failed');
  });
});
