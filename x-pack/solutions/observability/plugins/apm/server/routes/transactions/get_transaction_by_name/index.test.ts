/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransactionByName } from '.';

const requiredFieldsForHit = {
  '@timestamp': ['2025-06-15T14:30:00.000Z'],
  'trace.id': ['trace-abc123'],
  'transaction.id': ['tx-abc123'],
  'transaction.type': ['request'],
  'transaction.name': ['GET /api/orders'],
  'transaction.duration.us': [2500],
  'service.name': ['my-service'],
};

function createMockApmEventClient(esResponse: {
  hits: { hits: Array<{ fields?: Record<string, unknown[]> }> };
}) {
  const search = jest.fn().mockResolvedValue(esResponse);
  return { search } as any;
}

describe('getTransactionByName', () => {
  it('returns undefined when no hit is found', async () => {
    const apmEventClient = createMockApmEventClient({ hits: { hits: [] } });

    const result = await getTransactionByName({
      transactionName: 'GET /api/orders',
      serviceName: 'my-service',
      apmEventClient,
      start: 0,
      end: 50000,
    });

    expect(result).toBeUndefined();
  });

  it('returns the transaction when a hit is found', async () => {
    const apmEventClient = createMockApmEventClient({
      hits: { hits: [{ fields: requiredFieldsForHit }] },
    });

    const result = await getTransactionByName({
      transactionName: 'GET /api/orders',
      serviceName: 'my-service',
      apmEventClient,
      start: 0,
      end: 50000,
    });

    expect(result).toBeDefined();
    expect(result?.transaction.name).toBe('GET /api/orders');
    expect(result?.service.name).toBe('my-service');
  });

  describe('environment filtering', () => {
    it('includes an environment term filter when environment is provided', async () => {
      const apmEventClient = createMockApmEventClient({ hits: { hits: [] } });

      await getTransactionByName({
        transactionName: 'GET /api/orders',
        serviceName: 'my-service',
        environment: 'production',
        apmEventClient,
        start: 0,
        end: 50000,
      });

      const calledFilter = apmEventClient.search.mock.calls[0][1].query.bool.filter;
      expect(calledFilter).toContainEqual({ term: { 'service.environment': 'production' } });
    });

    it('does not apply an environment filter when environment is omitted', async () => {
      const apmEventClient = createMockApmEventClient({ hits: { hits: [] } });

      await getTransactionByName({
        transactionName: 'GET /api/orders',
        serviceName: 'my-service',
        apmEventClient,
        start: 0,
        end: 50000,
      });

      const calledFilter = apmEventClient.search.mock.calls[0][1].query.bool.filter;
      const hasEnvFilter = calledFilter.some(
        (f: any) => f?.term?.['service.environment'] !== undefined
      );
      expect(hasEnvFilter).toBe(false);
    });
  });
});
