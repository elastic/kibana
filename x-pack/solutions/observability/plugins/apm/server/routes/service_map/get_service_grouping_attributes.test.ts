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
import type { SavedServiceGroup } from '../../../common/service_groups';
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
      savedServiceGroups?: SavedServiceGroup[];
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

function namespacesPage(buckets: AttributeBucket[], afterKey?: { service: string }) {
  return {
    aggregations: {
      services: {
        buckets,
        ...(afterKey ? { after_key: afterKey } : {}),
      },
    },
  };
}

function savedGroupsPage(
  buckets: Record<string, { services: { buckets: Array<{ key: string }> } }>
) {
  return {
    aggregations: {
      service_groups: { buckets },
    },
  };
}

function savedGroup(id: string, groupName: string, kuery: string): SavedServiceGroup {
  return { id, groupName, kuery, updatedAt: 0 };
}

interface SearchParams {
  apm: { events?: string[] };
  query: { bool: { filter: unknown[]; must_not?: unknown[] } };
  aggs: Record<string, unknown>;
}

function getSearchCall(search: SearchMock, callIndex: number) {
  const callArgs = search.mock.calls[callIndex];
  return {
    operationName: callArgs[0] as string,
    params: callArgs[1] as SearchParams,
  };
}

function findSearchCall(search: SearchMock, operationName: string) {
  const index = search.mock.calls.findIndex((call) => call[0] === operationName);
  expect(index).toBeGreaterThanOrEqual(0);
  return getSearchCall(search, index);
}

describe('getServiceGroupingAttributes', () => {
  it('returns both namespaces of each service, and empty values when neither is set', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValue(
        namespacesPage([
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
      .mockResolvedValue(namespacesPage([bucket('checkout', 'shop', 'team-checkout')]));

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
    expect(call.params.aggs).toEqual({
      services: {
        composite: {
          size: 1000,
          sources: [{ service: { terms: { field: 'service.name' } } }],
        },
        aggs: {
          service_namespace: { terms: { field: 'service.namespace', size: 1 } },
          kubernetes_namespace: { terms: { field: 'kubernetes.namespace', size: 1 } },
        },
      },
    });
  });

  it('reads services in pages until a short page', async () => {
    const full = Array.from({ length: 1000 }, (_, index) =>
      bucket(`svc-${index}`, undefined, 'ns')
    );
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(namespacesPage(full, { service: 'svc-999' }))
      .mockResolvedValueOnce(namespacesPage([bucket('last', undefined, 'ns')]));

    const attributes = await getServiceGroupingAttributes(
      makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
    );

    expect(search).toHaveBeenCalledTimes(2);
    expect(getSearchCall(search, 1).params.aggs).toMatchObject({
      services: { composite: { after: { service: 'svc-999' } } },
    });
    expect(attributes['svc-0']).toEqual({ kubernetesNamespace: 'ns' });
    expect(attributes.last).toEqual({ kubernetesNamespace: 'ns' });
    expect(Object.keys(attributes)).toHaveLength(1001);
  });

  it('stops at the map service limit', async () => {
    const search: SearchMock = jest.fn().mockResolvedValue(
      namespacesPage(
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
        namespacesPage([
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

  it('assigns only the services that match each saved group KQL', async () => {
    const frontend = savedGroup(
      'g-frontend',
      'Frontend',
      'service.name: checkout or service.name: cart'
    );
    const payments = savedGroup('g-pay', 'Payments', 'service.name: ledger');
    const search: SearchMock = jest.fn().mockImplementation(async (operationName: string) => {
      if (operationName === 'get_service_grouping_attributes_for_service_map') {
        return namespacesPage([
          bucket('checkout', 'shop'),
          bucket('cart', undefined, 'team-cart'),
          bucket('ledger'),
          bucket('ops'),
        ]);
      }
      return savedGroupsPage({
        'g-frontend': {
          services: { buckets: [{ key: 'checkout' }, { key: 'cart' }] },
        },
        'g-pay': {
          services: { buckets: [{ key: 'ledger' }] },
        },
      });
    });

    const attributes = await getServiceGroupingAttributes(
      makeOptions({
        apmEventClient: { search } as unknown as APMEventClient,
        savedServiceGroups: [frontend, payments],
      })
    );

    expect(attributes.checkout).toEqual({
      serviceNamespace: 'shop',
      savedGroups: [{ id: 'g-frontend', name: 'Frontend' }],
    });
    expect(attributes.cart).toEqual({
      kubernetesNamespace: 'team-cart',
      savedGroups: [{ id: 'g-frontend', name: 'Frontend' }],
    });
    expect(attributes.ledger).toEqual({
      savedGroups: [{ id: 'g-pay', name: 'Payments' }],
    });
    expect(attributes.ops).toEqual({});

    const savedCall = findSearchCall(search, 'get_service_grouping_saved_groups_for_service_map');
    expect(savedCall.params.apm.events).toEqual([ProcessorEvent.transaction]);
    expect(savedCall.params.query.bool.filter).toEqual([
      ...rangeQuery(START, END),
      ...environmentQuery('production'),
    ]);
    expect(savedCall.params.aggs).toEqual({
      service_groups: {
        filters: {
          filters: {
            'g-frontend': kqlQuery(frontend.kuery)[0],
            'g-pay': kqlQuery(payments.kuery)[0],
          },
        },
        aggs: {
          services: {
            terms: { field: 'service.name', size: 5000 },
          },
        },
      },
    });
  });

  it('does not query saved groups when none are passed', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValue(namespacesPage([bucket('checkout', 'shop')]));

    await getServiceGroupingAttributes(
      makeOptions({
        apmEventClient: { search } as unknown as APMEventClient,
        savedServiceGroups: [],
      })
    );

    expect(search).toHaveBeenCalledTimes(1);
    expect(getSearchCall(search, 0).operationName).toBe(
      'get_service_grouping_attributes_for_service_map'
    );
  });

  it('lists a service that only appears through a saved group', async () => {
    const frontend = savedGroup('g-frontend', 'Frontend', 'service.name: ghost');
    const search: SearchMock = jest.fn().mockImplementation(async (operationName: string) => {
      if (operationName === 'get_service_grouping_attributes_for_service_map') {
        return namespacesPage([bucket('checkout', 'shop')]);
      }
      return savedGroupsPage({
        'g-frontend': {
          services: { buckets: [{ key: 'ghost' }] },
        },
      });
    });

    const attributes = await getServiceGroupingAttributes(
      makeOptions({
        apmEventClient: { search } as unknown as APMEventClient,
        savedServiceGroups: [frontend],
      })
    );

    expect(attributes.ghost).toEqual({
      savedGroups: [{ id: 'g-frontend', name: 'Frontend' }],
    });
    expect(attributes.checkout).toEqual({ serviceNamespace: 'shop' });
  });
});
