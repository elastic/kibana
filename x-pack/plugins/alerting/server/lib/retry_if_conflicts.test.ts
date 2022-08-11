/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { retryIfConflicts, RetryForConflictsAttempts } from './retry_if_conflicts';
import { loggingSystemMock } from '@kbn/core/server/mocks';

describe('retry_if_conflicts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should work when operation is a success', async () => {
    const result = await retryIfConflicts(MockLogger, MockOperationName, OperationSuccessful);
    expect(result).toBe(MockResult);
  });

  test('should throw error if not a conflict error', async () => {
    await expect(
      retryIfConflicts(MockLogger, MockOperationName, OperationFailure)
    ).rejects.toThrowError('wops');
  });

  for (let i = 1; i <= RetryForConflictsAttempts; i++) {
    test(`should work when operation conflicts ${i} times`, async () => {
      const result = await retryIfConflicts(
        MockLogger,
        MockOperationName,
        getOperationConflictsTimes(i)
      );
      expect(result).toBe(MockResult);
      expect(MockLogger.debug).toBeCalledTimes(i);
      for (let j = 0; j < i; j++) {
        expect(MockLogger.debug).nthCalledWith(i, `${MockOperationName} conflict, retrying ...`);
      }
    });
  }

  test(`should throw conflict error when conflicts > ${RetryForConflictsAttempts} times`, async () => {
    await expect(
      retryIfConflicts(
        MockLogger,
        MockOperationName,
        getOperationConflictsTimes(RetryForConflictsAttempts + 1)
      )
    ).rejects.toThrowError(SavedObjectsErrorHelpers.createConflictError('alert', MockAlertId));
    expect(MockLogger.debug).toBeCalledTimes(RetryForConflictsAttempts);
    expect(MockLogger.warn).toBeCalledTimes(1);
    expect(MockLogger.warn).toBeCalledWith(`${MockOperationName} conflict, exceeded retries`);
  });
});

const MockAlertId = 'alert-id';
const MockOperationName = 'conflict-retryable-operation';
const MockLogger = loggingSystemMock.create().get();
const MockResult = 42;

async function OperationSuccessful() {
  return MockResult;
}

async function OperationFailure() {
  throw new Error('wops');
}

function getOperationConflictsTimes(times: number) {
  return async function OperationConflictsTimes() {
    times--;
    if (times >= 0) {
      throw SavedObjectsErrorHelpers.createConflictError('alert', MockAlertId);
    }

    return MockResult;
  };
}
