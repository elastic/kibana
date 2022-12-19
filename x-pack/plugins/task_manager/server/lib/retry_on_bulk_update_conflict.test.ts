/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { SerializedConcreteTaskInstance, TaskStatus } from '../task';
import { NUM_RETRIES, retryOnBulkUpdateConflict } from './retry_on_bulk_update_conflict';

const mockSavedObjectsRepository = savedObjectsRepositoryMock.create();
const mockLogger = loggingSystemMock.create().get();
const mockedDate = new Date('2019-02-12T21:01:22.479Z');

const task1 = {
  type: 'task',
  id: 'task:123456',
  attributes: {
    runAt: mockedDate.toISOString(),
    scheduledAt: mockedDate.toISOString(),
    startedAt: null,
    retryAt: null,
    params: `{ "hello": "world" }`,
    state: `{ "id": "123456" }`,
    taskType: 'alert',
    attempts: 3,
    status: 'idle' as TaskStatus,
    ownerId: null,
    traceparent: '',
  },
};

const task2 = {
  type: 'task',
  id: 'task:324242',
  attributes: {
    runAt: mockedDate.toISOString(),
    scheduledAt: mockedDate.toISOString(),
    startedAt: null,
    retryAt: null,
    params: `{ "hello": "world" }`,
    state: `{ "foo": "bar" }`,
    taskType: 'report',
    attempts: 3,
    status: 'idle' as TaskStatus,
    ownerId: null,
    traceparent: '',
  },
};

const task3 = {
  type: 'task',
  id: 'task:xyaaa',
  attributes: {
    runAt: mockedDate.toISOString(),
    scheduledAt: mockedDate.toISOString(),
    startedAt: null,
    retryAt: null,
    params: `{ "goodbye": "world" }`,
    state: `{ "foo": "bar" }`,
    taskType: 'action',
    attempts: 3,
    status: 'idle' as TaskStatus,
    ownerId: null,
    traceparent: '',
  },
};

describe('retryOnBulkUpdateConflict', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should not retry when all updates are successful', async () => {
    const savedObjectResponse = [
      {
        id: task1.id,
        type: task1.type,
        attributes: task1.attributes,
        references: [],
      },
    ];
    mockSavedObjectsRepository.bulkUpdate.mockResolvedValueOnce({
      saved_objects: savedObjectResponse,
    });
    const { savedObjects } = await retryOnBulkUpdateConflict<SerializedConcreteTaskInstance>({
      logger: mockLogger,
      savedObjectsRepository: mockSavedObjectsRepository,
      objects: [task1],
    });

    expect(mockSavedObjectsRepository.bulkUpdate).toHaveBeenCalledTimes(1);
    expect(savedObjects).toEqual(savedObjectResponse);
  });

  test('should throw error when saved objects bulkUpdate throws an error', async () => {
    mockSavedObjectsRepository.bulkUpdate.mockImplementationOnce(() => {
      throw new Error('fail');
    });
    await expect(() =>
      retryOnBulkUpdateConflict<SerializedConcreteTaskInstance>({
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        objects: [task1],
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"fail"`);
  });

  test('should not retry and return non-conflict errors', async () => {
    const savedObjectResponse = [
      {
        id: task1.id,
        type: task1.type,
        attributes: task1.attributes,
        references: [],
      },
      {
        id: task2.id,
        type: task2.type,
        attributes: task2.attributes,
        error: {
          error: `Not a conflict`,
          message: `Some error that's not a conflict`,
          statusCode: 404,
        },
        references: [],
      },
    ];
    mockSavedObjectsRepository.bulkUpdate.mockResolvedValueOnce({
      saved_objects: savedObjectResponse,
    });
    const { savedObjects } = await retryOnBulkUpdateConflict<SerializedConcreteTaskInstance>({
      logger: mockLogger,
      savedObjectsRepository: mockSavedObjectsRepository,
      objects: [task1, task2],
    });

    expect(mockSavedObjectsRepository.bulkUpdate).toHaveBeenCalledTimes(1);
    expect(savedObjects).toEqual(savedObjectResponse);
  });

  test(`should return conflict errors when number of retries exceeds ${NUM_RETRIES}`, async () => {
    const savedObjectResponse = [
      {
        id: task2.id,
        type: task2.type,
        attributes: task2.attributes,
        error: {
          error: `Conflict`,
          message: `There was a conflict`,
          statusCode: 409,
        },
        references: [],
      },
    ];
    mockSavedObjectsRepository.bulkUpdate.mockResolvedValue({
      saved_objects: savedObjectResponse,
    });
    const { savedObjects } = await retryOnBulkUpdateConflict<SerializedConcreteTaskInstance>({
      logger: mockLogger,
      savedObjectsRepository: mockSavedObjectsRepository,
      objects: [task2],
    });

    expect(mockSavedObjectsRepository.bulkUpdate).toHaveBeenCalledTimes(NUM_RETRIES + 1);
    expect(savedObjects).toEqual(savedObjectResponse);

    expect(mockLogger.warn).toBeCalledWith('Bulk update saved object conflicts, exceeded retries');
  });

  test('should retry as expected when there are conflicts', async () => {
    mockSavedObjectsRepository.bulkUpdate
      .mockResolvedValueOnce({
        saved_objects: [
          {
            id: task1.id,
            type: task1.type,
            attributes: task1.attributes,
            references: [],
          },
          {
            id: task2.id,
            type: task2.type,
            attributes: task2.attributes,
            error: {
              error: `Conflict`,
              message: `This is a conflict`,
              statusCode: 409,
            },
            references: [],
          },
          {
            id: task3.id,
            type: task3.type,
            attributes: task3.attributes,
            error: {
              error: `Conflict`,
              message: `This is a conflict`,
              statusCode: 409,
            },
            references: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        saved_objects: [
          {
            id: task2.id,
            type: task2.type,
            attributes: task2.attributes,
            error: {
              error: `Conflict`,
              message: `This is a conflict`,
              statusCode: 409,
            },
            references: [],
          },
          {
            id: task3.id,
            type: task3.type,
            attributes: task3.attributes,
            references: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        saved_objects: [
          {
            id: task2.id,
            type: task2.type,
            attributes: task2.attributes,
            error: {
              error: `Conflict`,
              message: `This is a conflict`,
              statusCode: 409,
            },
            references: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        saved_objects: [
          {
            id: task2.id,
            type: task2.type,
            attributes: task2.attributes,
            error: {
              error: `Conflict`,
              message: `This is a conflict`,
              statusCode: 409,
            },
            references: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        saved_objects: [
          {
            id: task2.id,
            type: task2.type,
            attributes: task2.attributes,
            references: [],
          },
        ],
      });
    const { savedObjects } = await retryOnBulkUpdateConflict<SerializedConcreteTaskInstance>({
      logger: mockLogger,
      savedObjectsRepository: mockSavedObjectsRepository,
      objects: [task1, task2, task3],
      retries: 5,
    });

    expect(mockSavedObjectsRepository.bulkUpdate).toHaveBeenCalledTimes(5);
    expect(mockSavedObjectsRepository.bulkUpdate).toHaveBeenNthCalledWith(
      1,
      [task1, task2, task3],
      undefined
    );
    expect(mockSavedObjectsRepository.bulkUpdate).toHaveBeenNthCalledWith(
      2,
      [task2, task3],
      undefined
    );
    expect(mockSavedObjectsRepository.bulkUpdate).toHaveBeenNthCalledWith(3, [task2], undefined);
    expect(mockSavedObjectsRepository.bulkUpdate).toHaveBeenNthCalledWith(4, [task2], undefined);
    expect(mockSavedObjectsRepository.bulkUpdate).toHaveBeenNthCalledWith(5, [task2], undefined);
    expect(savedObjects).toEqual([
      {
        id: task1.id,
        type: task1.type,
        attributes: task1.attributes,
        references: [],
      },
      {
        id: task3.id,
        type: task3.type,
        attributes: task3.attributes,
        references: [],
      },
      {
        id: task2.id,
        type: task2.type,
        attributes: task2.attributes,
        references: [],
      },
    ]);
  });
});
