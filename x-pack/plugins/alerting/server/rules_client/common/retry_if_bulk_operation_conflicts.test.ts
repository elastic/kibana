/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode } from '@kbn/es-query';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import { retryIfBulkOperationConflicts } from './retry_if_bulk_operation_conflicts';
import { RETRY_IF_CONFLICTS_ATTEMPTS } from './wait_before_next_retry';

const mockFilter: KueryNode = {
  type: 'function',
  value: 'mock',
};

const mockLogger = loggingSystemMock.create().get();

const mockSuccessfulResult = {
  accListSpecificForBulkOperation: [['apiKey1'], ['taskId1']],
  errors: [],
  rules: [],
};

const error409 = {
  message: 'some fake message',
  status: 409,
  rule: {
    id: 'fake_rule_id',
    name: 'fake rule name',
  },
};

const getOperationConflictsTimes = (times: number) => {
  return async () => {
    conflictOperationMock();
    times--;
    if (times >= 0) {
      return {
        accListSpecificForBulkOperation: [[], []],
        errors: [error409],
        rules: [],
      };
    }
    return mockSuccessfulResult;
  };
};

const OperationSuccessful = async () => mockSuccessfulResult;
const conflictOperationMock = jest.fn();

describe('retryIfBulkOperationConflicts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should work when operation is successful', async () => {
    const result = await retryIfBulkOperationConflicts({
      action: 'ENABLE',
      logger: mockLogger,
      bulkOperation: OperationSuccessful,
      filter: mockFilter,
    });

    expect(result).toEqual(mockSuccessfulResult);
  });

  test('should throw error when operation fails', async () => {
    await expect(
      retryIfBulkOperationConflicts({
        action: 'ENABLE',
        logger: mockLogger,
        bulkOperation: async () => {
          throw Error('Test failure');
        },
        filter: mockFilter,
      })
    ).rejects.toThrowError('Test failure');
  });

  test(`should return conflict errors when number of retries exceeds ${RETRY_IF_CONFLICTS_ATTEMPTS}`, async () => {
    const result = await retryIfBulkOperationConflicts({
      action: 'ENABLE',
      logger: mockLogger,
      bulkOperation: getOperationConflictsTimes(RETRY_IF_CONFLICTS_ATTEMPTS + 1),
      filter: mockFilter,
    });

    expect(result.errors).toEqual([error409]);
    expect(mockLogger.warn).toBeCalledWith('Bulk enable rules conflicts, exceeded retries');
  });

  for (let i = 1; i <= RETRY_IF_CONFLICTS_ATTEMPTS; i++) {
    test(`should work when operation conflicts ${i} times`, async () => {
      const result = await retryIfBulkOperationConflicts({
        action: 'ENABLE',
        logger: mockLogger,
        bulkOperation: getOperationConflictsTimes(i),
        filter: mockFilter,
      });

      expect(conflictOperationMock.mock.calls.length).toBe(i + 1);
      expect(result).toStrictEqual(mockSuccessfulResult);
    });
  }
});
