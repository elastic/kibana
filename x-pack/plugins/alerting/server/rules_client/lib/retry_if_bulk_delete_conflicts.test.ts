/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuid from 'uuid';
import { KueryNode } from '@kbn/es-query';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SavedObjectsBulkDeleteResponse } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsBulkUpdateObject } from '@kbn/core/server';

import { retryIfBulkDeleteConflicts } from './retry_if_bulk_delete_conflicts';
import { RETRY_IF_CONFLICTS_ATTEMPTES } from './wait_before_next_retry';
import type { BulkEditError } from '../rules_client';
import type { RawRule } from '../../types';

const mockFilter: KueryNode = {
  type: 'function',
  value: 'mock',
};
const mockOperationName = 'conflict-retryable-operation';
const mockLogger = loggingSystemMock.create().get();
const rulesMock = [
  {
    attributes: {
      alertTypeId: 'test.noop',
      apiKey: 'M0ZMOXJJTUJ5MUVoc3gxWl91cTY6OHdmRm9XYjFSWEdVaWRjcHJ0bDNhQQ==',
      scheduledTaskId: '952e7030-4567-11ed-a4ec-4b900b904b00',
    },
    id: '952e7030-4567-11ed-a4ec-4b900b904b00',
  },
  {
    attributes: {
      alertTypeId: 'test.noop',
      apiKey: 'MmxMOXJJTUJ5MUVoc3gxWjl1cWg6TmYyZTRSZ1RUOG1oNnFOdmh3UFlUdw==',
      scheduledTaskId: '93f26dc0-4567-11ed-a4ec-4b900b904b00',
    },
    id: '93f26dc0-4567-11ed-a4ec-4b900b904b00',
  },
];

const mockSuccessfulResult = {
  apiKeysToInvalidate: [] as string[],
  errors: [] as BulkEditError[],
  ids: ['93f26dc0-4567-11ed-a4ec-4b900b904b00', '952e7030-4567-11ed-a4ec-4b900b904b00'],
  result: {
    statuses: [
      {
        id: uuid(),
        type: '',
        success: true,
      },
      {
        id: uuid(),
        type: '',
        success: true,
      },
    ],
  } as SavedObjectsBulkDeleteResponse,
  rules: rulesMock as Array<SavedObjectsBulkUpdateObject<RawRule>>,
  taskIdsToDelete: [],
};

const OperationSuccessful = async () => mockSuccessfulResult;
const conflictOperationMock = jest.fn();

const getOperationConflictsTimes = (times: number) => {
  return () => {
    conflictOperationMock();
    times--;
    if (times >= 0) {
      return {
        ...mockSuccessfulResult,
      };
    }
    return mockSuccessfulResult;
  };
};

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
});
