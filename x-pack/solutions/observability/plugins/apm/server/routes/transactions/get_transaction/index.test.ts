/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransaction } from '.';

const requiredFieldsForHit = {
  'trace.id': ['a1b2c3d4e5f67890abcdef1234567890'],
  'agent.name': ['go'],
  'processor.event': ['transaction'],
  '@timestamp': ['2025-06-15T14:30:00.000Z'],
  'timestamp.us': [9876543210],
  'service.name': ['test-service'],
  'transaction.id': ['abc123def456'],
  'transaction.duration.us': [2500],
  'transaction.name': ['POST /api/test'],
  'transaction.sampled': [true],
  'transaction.type': ['request'],
};

function createMockApmEventClient(esResponse: {
  hits: { hits: Array<{ fields?: Record<string, unknown[]>; _source?: Record<string, unknown> }> };
}) {
  const search = jest.fn().mockResolvedValue(esResponse);
  return { search } as any;
}

describe('getTransaction', () => {
  it('returns undefined when no hit is returned', async () => {
    const apmEventClient = createMockApmEventClient({ hits: { hits: [] } });
    const result = await getTransaction({
      transactionId: 'abc123def456',
      apmEventClient,
      start: 0,
      end: 50000,
    });
    expect(result).toBeUndefined();
  });

  it('returns transaction with server undefined when hit has no server fields', async () => {
    const apmEventClient = createMockApmEventClient({
      hits: {
        hits: [{ fields: requiredFieldsForHit, _source: {} }],
      },
    });
    const result = await getTransaction({
      transactionId: 'abc123def456',
      traceId: 'a1b2c3d4e5f67890abcdef1234567890',
      apmEventClient,
      start: 0,
      end: 50000,
    });
    expect(result).toBeDefined();
    expect(result?.server).toStrictEqual({ port: undefined });
    expect(result?.transaction.name).toBe('POST /api/test');
  });

  it('returns transaction with server.port as number when hit has server.port (string from ES)', async () => {
    const apmEventClient = createMockApmEventClient({
      hits: {
        hits: [
          {
            fields: {
              ...requiredFieldsForHit,
              'server.address': ['test.address'],
              'server.port': ['8080'],
            },
            _source: {},
          },
        ],
      },
    });
    const result = await getTransaction({
      transactionId: 'abc123def456',
      apmEventClient,
      start: 0,
      end: 50000,
    });
    expect(result).toBeDefined();
    expect(result?.server).toEqual({ address: 'test.address', port: 8080 });
  });

  it('returns transaction with server.port undefined when server has no port', async () => {
    const apmEventClient = createMockApmEventClient({
      hits: {
        hits: [
          {
            fields: {
              ...requiredFieldsForHit,
              'server.address': ['test.address'],
            },
            _source: {},
          },
        ],
      },
    });
    const result = await getTransaction({
      transactionId: 'abc123def456',
      apmEventClient,
      start: 0,
      end: 50000,
    });
    expect(result).toBeDefined();
    expect(result?.server).toEqual({ address: 'test.address', port: undefined });
  });

  it('includes transaction.marks and span from _source when present', async () => {
    const apmEventClient = createMockApmEventClient({
      hits: {
        hits: [
          {
            fields: requiredFieldsForHit,
            _source: {
              transaction: { marks: { agent: { 'custom-mark': 456 } } },
              span: {
                links: [{ trace: { id: 'trace-xyz789' }, span: { id: 'span-xyz789' } }],
              },
            },
          },
        ],
      },
    });
    const result = await getTransaction({
      transactionId: 'abc123def456',
      apmEventClient,
      start: 0,
      end: 50000,
    });
    expect(result).toBeDefined();
    expect(result?.transaction.marks).toEqual({ agent: { 'custom-mark': 456 } });
    expect(result?.span).toEqual({
      links: [{ trace: { id: 'trace-xyz789' }, span: { id: 'span-xyz789' } }],
    });
  });
});
