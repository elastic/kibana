/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KueryNode } from '@kbn/es-query';

import { retryIfBulkEditConflicts } from './retry_if_bulk_edit_conflicts';
import { RETRY_IF_CONFLICTS_ATTEMPTS } from './wait_before_next_retry';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { BulkEditSkipReason } from '../../../common/bulk_edit';

const mockFilter: KueryNode = {
  type: 'function',
  value: 'mock',
};

const mockOperationName = 'conflict-retryable-operation';
const mockLogger = loggingSystemMock.create().get();
const mockSuccessfulResult = {
  apiKeysToInvalidate: [],
  rules: [
    { id: '1', type: 'alert', attributes: {} },
    { id: '2', type: 'alert', attributes: { name: 'Test rule 2' } },
  ],
  resultSavedObjects: [
    { id: '1', type: 'alert', attributes: {}, references: [] },
    { id: '2', type: 'alert', attributes: { name: 'Test rule 2' }, references: [] },
  ],
  errors: [],
  skipped: [
    { id: 'skip-1', name: 'skip-1', skip_reason: 'RULE_NOT_MODIFIED' as BulkEditSkipReason },
    { id: 'skip-2', name: 'skip-2', skip_reason: 'RULE_NOT_MODIFIED' as BulkEditSkipReason },
    { id: 'skip-5', name: 'skip-5', skip_reason: 'RULE_NOT_MODIFIED' as BulkEditSkipReason },
  ],
};

async function OperationSuccessful() {
  return mockSuccessfulResult;
}

const conflictOperationMock = jest.fn();

function getOperationConflictsTimes(times: number) {
  return async function OperationConflictsTimes() {
    conflictOperationMock();
    times--;
    if (times >= 0) {
      return {
        ...mockSuccessfulResult,
        resultSavedObjects: [
          { id: '1', type: 'alert', attributes: {}, references: [] },
          {
            id: '2',
            type: 'alert',
            attributes: {},
            references: [],
            error: {
              statusCode: 409,
              error: 'Conflict',
              message: 'Saved object [alert/2] conflict',
            },
          },
        ],
      };
    }
    return mockSuccessfulResult;
  };
}

describe('retryIfBulkEditConflicts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should work when operation is a success', async () => {
    const result = await retryIfBulkEditConflicts(
      mockLogger,
      mockOperationName,
      OperationSuccessful,
      mockFilter
    );
    expect(result).toEqual({
      apiKeysToInvalidate: [],
      errors: [],
      skipped: [
        { id: 'skip-1', name: 'skip-1', skip_reason: 'RULE_NOT_MODIFIED' },
        { id: 'skip-2', name: 'skip-2', skip_reason: 'RULE_NOT_MODIFIED' },
        { id: 'skip-5', name: 'skip-5', skip_reason: 'RULE_NOT_MODIFIED' },
      ],
      results: [
        {
          attributes: {},
          id: '1',
          references: [],
          type: 'alert',
        },
        {
          attributes: {
            name: 'Test rule 2',
          },
          id: '2',
          references: [],
          type: 'alert',
        },
      ],
    });
  });

  test(`should throw error when operation fails`, async () => {
    await expect(
      retryIfBulkEditConflicts(
        mockLogger,
        mockOperationName,
        async () => {
          throw Error('Test failure');
        },
        mockFilter
      )
    ).rejects.toThrowError('Test failure');
  });

  test(`should return conflict errors when number of retries exceeds ${RETRY_IF_CONFLICTS_ATTEMPTS}`, async () => {
    const result = await retryIfBulkEditConflicts(
      mockLogger,
      mockOperationName,
      getOperationConflictsTimes(RETRY_IF_CONFLICTS_ATTEMPTS + 1),
      mockFilter
    );

    expect(result.errors).toEqual([
      {
        message: 'Saved object [alert/2] conflict',
        rule: {
          id: '2',
          name: 'Test rule 2',
        },
      },
    ]);
    expect(mockLogger.warn).toBeCalledWith(`${mockOperationName} conflicts, exceeded retries`);
  });

  for (let i = 1; i <= RETRY_IF_CONFLICTS_ATTEMPTS + 1; i++) {
    test(`should work when operation conflicts ${i} times`, async () => {
      const result = await retryIfBulkEditConflicts(
        mockLogger,
        mockOperationName,
        getOperationConflictsTimes(i),
        mockFilter
      );
      expect(result).toBe(result);
    });
  }

  test('should not return duplicated skip results when the underlying bulkEditOperation is retried multiple times and returns the same skip results on every attempt', async () => {
    const result = await retryIfBulkEditConflicts(
      mockLogger,
      mockOperationName,
      getOperationConflictsTimes(3),
      mockFilter,
      undefined,
      ['apikey1', 'apikey2'],
      [],
      [],
      [
        { id: 'skip-1', name: 'skip-1', skip_reason: 'RULE_NOT_MODIFIED' },
        { id: 'skip-2', name: 'skip-2', skip_reason: 'RULE_NOT_MODIFIED' },
        { id: 'skip-2', name: 'skip-2', skip_reason: 'RULE_NOT_MODIFIED' },
        { id: 'skip-3', name: 'skip-3', skip_reason: 'RULE_NOT_MODIFIED' },
      ]
    );

    expect(result.skipped).toEqual([
      { id: 'skip-1', name: 'skip-1', skip_reason: 'RULE_NOT_MODIFIED' },
      { id: 'skip-2', name: 'skip-2', skip_reason: 'RULE_NOT_MODIFIED' },
      { id: 'skip-3', name: 'skip-3', skip_reason: 'RULE_NOT_MODIFIED' },
      { id: 'skip-5', name: 'skip-5', skip_reason: 'RULE_NOT_MODIFIED' },
    ]);
  });
});
