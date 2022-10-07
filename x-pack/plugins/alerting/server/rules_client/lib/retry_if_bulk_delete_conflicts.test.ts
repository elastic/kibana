/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode } from '@kbn/es-query';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import { retryIfBulkDeleteConflicts } from './retry_if_bulk_delete_conflicts';
import { RETRY_IF_CONFLICTS_ATTEMPTES } from './wait_before_next_retry';
import type { BulkDeleteError } from '../rules_client';

const mockFilter: KueryNode = {
  type: 'function',
  value: 'mock',
};

const mockLogger = loggingSystemMock.create().get();
const mockSuccessfulResult = {
  apiKeysToInvalidate: [] as string[],
  errors: [] as BulkDeleteError[],
  taskIdsToDelete: [] as string[],
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
        ...mockSuccessfulResult,
        errors: [error409],
      };
    }
    return mockSuccessfulResult;
  };
};

const OperationSuccessful = async () => mockSuccessfulResult;
const conflictOperationMock = jest.fn();

describe('retryIfBulkEditConflicts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should work when operation is a success', async () => {
    const result = await retryIfBulkDeleteConflicts(mockLogger, OperationSuccessful, mockFilter);

    expect(result).toEqual({
      apiKeysToInvalidate: [],
      errors: [],
      taskIdsToDelete: [],
    });
  });

  test('should throw error when operation fails', async () => {
    await expect(
      retryIfBulkDeleteConflicts(
        mockLogger,
        async () => {
          throw Error('Test failure');
        },
        mockFilter
      )
    ).rejects.toThrowError('Test failure');
  });

  test(`should return conflict errors when number of retries exceeds ${RETRY_IF_CONFLICTS_ATTEMPTES}`, async () => {
    const result = await retryIfBulkDeleteConflicts(
      mockLogger,
      getOperationConflictsTimes(RETRY_IF_CONFLICTS_ATTEMPTES + 1),
      mockFilter
    );

    expect(result.errors).toEqual([error409]);
    expect(mockLogger.warn).toBeCalledWith('Bulk delele rules conflicts, exceeded retries');
  });

  for (let i = 1; i <= RETRY_IF_CONFLICTS_ATTEMPTES; i++) {
    test(`should work when operation conflicts ${i} times`, async () => {
      const result = await retryIfBulkDeleteConflicts(
        mockLogger,
        getOperationConflictsTimes(i),
        mockFilter
      );
      expect(result).toBe(result);
    });
  }
});
