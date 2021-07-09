/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';
import { loggingSystemMock } from '../../../../../src/core/server/mocks';
import { RetryForNotFoundAttempts, retryIfNotFound } from './retry_if_not_found';

describe('retry_if_not_found', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should work when operation is a success', async () => {
    const result = await retryIfNotFound(MockLogger, MockOperationName, OperationSuccessful);
    expect(result).toBe(MockResult);
  });

  test('should throw error if not a not found error', async () => {
    await expect(
      retryIfNotFound(MockLogger, MockOperationName, OperationFailure)
    ).rejects.toThrowError('wops');
  });

  for (let i = 1; i <= RetryForNotFoundAttempts; i++) {
    test(`should work when not found returned ${i} times`, async () => {
      const result = await retryIfNotFound(
        MockLogger,
        MockOperationName,
        getOperationNotFoundTimes(i)
      );
      expect(result).toBe(MockResult);
      expect(MockLogger.debug).toBeCalledTimes(i);
      for (let j = 0; j < i; j++) {
        expect(MockLogger.debug).nthCalledWith(i, `${MockOperationName} not found, retrying ...`);
      }
    });
  }

  test(`should throw not found error when 404 error returned > ${RetryForNotFoundAttempts} times`, async () => {
    await expect(
      retryIfNotFound(
        MockLogger,
        MockOperationName,
        getOperationNotFoundTimes(RetryForNotFoundAttempts + 1)
      )
    ).rejects.toThrowError(
      SavedObjectsErrorHelpers.createGenericNotFoundError('action', MockActionId)
    );
    expect(MockLogger.debug).toBeCalledTimes(RetryForNotFoundAttempts);
    expect(MockLogger.warn).toBeCalledTimes(1);
    expect(MockLogger.warn).toBeCalledWith(`${MockOperationName} not found, exceeded retries`);
  });
});

const MockActionId = 'action-id';
const MockOperationName = 'not-found-retryable-operation';
const MockLogger = loggingSystemMock.create().get();
const MockResult = 42;

async function OperationSuccessful() {
  return MockResult;
}

async function OperationFailure() {
  throw new Error('wops');
}

function getOperationNotFoundTimes(times: number) {
  return async function OperationNotFoundTimes() {
    times--;
    if (times >= 0) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError('action', MockActionId);
    }

    return MockResult;
  };
}
