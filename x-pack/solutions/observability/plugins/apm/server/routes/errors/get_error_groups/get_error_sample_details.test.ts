/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getErrorSampleDetails } from './get_error_sample_details';

const mockGetTransaction = jest.fn();
jest.mock('../../transactions/get_transaction', () => ({
  getTransaction: (...args: any[]) => mockGetTransaction(...args),
}));

const errorHitFields = {
  _id: ['error-doc-id'],
  'agent.name': ['nodejs'],
  'processor.event': ['error'],
  'timestamp.us': [1700000000000000],
  '@timestamp': ['2025-11-14T00:00:00.000Z'],
  'service.name': ['test-service'],
  'error.grouping_key': ['abc123'],
  'trace.id': ['trace-abc'],
  'transaction.id': ['txn-abc'],
  'error.id': ['error-id-1'],
};

function createMockApmEventClient(hits: any[] = []) {
  return {
    search: jest.fn().mockResolvedValue({
      hits: { hits },
    }),
  } as any;
}

describe('getErrorSampleDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error data with transaction undefined when getTransaction throws', async () => {
    mockGetTransaction.mockRejectedValue(
      new Error('Missing required fields (transaction.sampled) in event')
    );

    const apmEventClient = createMockApmEventClient([
      { fields: errorHitFields, _source: { error: { exception: [] } } },
    ]);

    const result = await getErrorSampleDetails({
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      serviceName: 'test-service',
      errorId: 'error-id-1',
      apmEventClient,
      start: 0,
      end: 50000,
    });

    expect(result.error).toBeDefined();
    expect(result.transaction).toBeUndefined();
  });

  it('returns error data with transaction when getTransaction succeeds', async () => {
    const mockTransaction = {
      transaction: { id: 'txn-abc', name: 'GET /api', type: 'request', duration: { us: 1000 } },
      service: { name: 'test-service' },
      trace: { id: 'trace-abc' },
    };
    mockGetTransaction.mockResolvedValue(mockTransaction);

    const apmEventClient = createMockApmEventClient([
      { fields: errorHitFields, _source: { error: { exception: [] } } },
    ]);

    const result = await getErrorSampleDetails({
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      serviceName: 'test-service',
      errorId: 'error-id-1',
      apmEventClient,
      start: 0,
      end: 50000,
    });

    expect(result.error).toBeDefined();
    expect(result.transaction).toBe(mockTransaction);
  });

  it('does not call getTransaction when transactionId is missing', async () => {
    const fieldsWithoutTransaction = { ...errorHitFields };
    delete (fieldsWithoutTransaction as any)['transaction.id'];
    delete (fieldsWithoutTransaction as any)['trace.id'];

    const apmEventClient = createMockApmEventClient([
      { fields: fieldsWithoutTransaction, _source: { error: { exception: [] } } },
    ]);

    const result = await getErrorSampleDetails({
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      serviceName: 'test-service',
      errorId: 'error-id-1',
      apmEventClient,
      start: 0,
      end: 50000,
    });

    expect(result.error).toBeDefined();
    expect(result.transaction).toBeUndefined();
    expect(mockGetTransaction).not.toHaveBeenCalled();
  });
});
