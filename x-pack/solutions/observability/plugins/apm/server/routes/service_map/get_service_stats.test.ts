/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ApmDocumentType } from '@kbn/apm-data-access-plugin/common';
import { getServiceStats } from './get_service_stats';
import type { IEnvOptions } from './get_service_map';

type SearchMock = jest.Mock<Promise<unknown>>;

function makeOptions(
  overrides: Partial<IEnvOptions & { maxNumberOfServices: number }> = {}
): IEnvOptions & { maxNumberOfServices: number } {
  return {
    apmEventClient: {} as APMEventClient,
    config: {} as IEnvOptions['config'],
    environment: 'opbeans',
    start: 1_700_000_000_000,
    end: 1_700_000_900_000,
    logger: { debug: jest.fn() } as unknown as IEnvOptions['logger'],
    maxNumberOfServices: 50,
    searchAggregatedTransactions: true,
    serviceName: 'opbeans-python',
    kuery: 'service.name: "opbeans-python" and transaction.name: "GET opbeans.views.home"',
    ...overrides,
  };
}

function aggResponse(serviceNames: string[]) {
  return {
    aggregations: {
      services: {
        buckets: serviceNames.map((name) => ({
          key: name,
          agent_name: { buckets: [{ key: 'python' }] },
        })),
      },
    },
  };
}

function getSearchCall(search: SearchMock, callIndex: number) {
  const callArgs = search.mock.calls[callIndex];
  return {
    operationName: callArgs[0] as string,
    params: callArgs[1] as {
      apm: { sources?: Array<{ documentType: string }>; events?: string[] };
    },
  };
}

describe('getServiceStats — rollup/kuery field-mismatch fallback', () => {
  it('uses ServiceTransactionMetric and does NOT retry when the rollup has data', async () => {
    const search: SearchMock = jest.fn().mockResolvedValueOnce(aggResponse(['opbeans-python']));
    const apmEventClient = { search } as unknown as APMEventClient;

    const services = await getServiceStats(makeOptions({ apmEventClient }));

    expect(search).toHaveBeenCalledTimes(1);
    expect(getSearchCall(search, 0).params.apm.sources?.[0].documentType).toBe(
      ApmDocumentType.ServiceTransactionMetric
    );
    expect(services).toHaveLength(1);
    expect(services[0]['service.name']).toBe('opbeans-python');
  });

  it('retries against TransactionMetric when the ServiceTransactionMetric rollup returns 0 buckets and a kuery is set', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(aggResponse([]))
      .mockResolvedValueOnce(aggResponse(['opbeans-python']));
    const apmEventClient = { search } as unknown as APMEventClient;

    const services = await getServiceStats(makeOptions({ apmEventClient }));

    expect(search).toHaveBeenCalledTimes(2);
    expect(getSearchCall(search, 0).params.apm.sources?.[0].documentType).toBe(
      ApmDocumentType.ServiceTransactionMetric
    );
    expect(getSearchCall(search, 0).operationName).toBe('get_service_stats_for_service_map');

    expect(getSearchCall(search, 1).params.apm.sources?.[0].documentType).toBe(
      ApmDocumentType.TransactionMetric
    );
    expect(getSearchCall(search, 1).operationName).toBe(
      'get_service_stats_for_service_map_fallback'
    );

    expect(services).toHaveLength(1);
    expect(services[0]['service.name']).toBe('opbeans-python');
  });

  it('does NOT retry when the rollup is empty but there is no kuery (the fallback only buys us anything for kuery field mismatches)', async () => {
    const search: SearchMock = jest.fn().mockResolvedValueOnce(aggResponse([]));
    const apmEventClient = { search } as unknown as APMEventClient;

    const services = await getServiceStats(
      makeOptions({ apmEventClient, kuery: undefined, serviceName: undefined })
    );

    expect(search).toHaveBeenCalledTimes(1);
    expect(services).toEqual([]);
  });

  it('does NOT retry when the rollup is empty but the kuery is just whitespace', async () => {
    const search: SearchMock = jest.fn().mockResolvedValueOnce(aggResponse([]));
    const apmEventClient = { search } as unknown as APMEventClient;

    await getServiceStats(makeOptions({ apmEventClient, kuery: '   ' }));

    expect(search).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry when searchAggregatedTransactions=false (already using raw transactions, fallback would be a duplicate)', async () => {
    const search: SearchMock = jest.fn().mockResolvedValueOnce(aggResponse([]));
    const apmEventClient = { search } as unknown as APMEventClient;

    const services = await getServiceStats(
      makeOptions({ apmEventClient, searchAggregatedTransactions: false })
    );

    expect(search).toHaveBeenCalledTimes(1);
    expect(getSearchCall(search, 0).params.apm.events).toContain('transaction');
    expect(services).toEqual([]);
  });

  it('returns the fallback empty result when both queries miss (genuine "no data" case)', async () => {
    const search: SearchMock = jest
      .fn()
      .mockResolvedValueOnce(aggResponse([]))
      .mockResolvedValueOnce(aggResponse([]));
    const apmEventClient = { search } as unknown as APMEventClient;

    const services = await getServiceStats(makeOptions({ apmEventClient }));

    expect(search).toHaveBeenCalledTimes(2);
    expect(services).toEqual([]);
  });
});
