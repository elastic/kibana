/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { asNotificationExecutionSource } from '../lib';
import { actionExecutorMock } from '../lib/action_executor.mock';
import { UnsecuredActionsClient } from './unsecured_actions_client';

const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const actionExecutor = actionExecutorMock.create();
const executionEnqueuer = jest.fn();
const logger = loggingSystemMock.create().get();

let unsecuredActionsClient: UnsecuredActionsClient;

beforeEach(() => {
  jest.resetAllMocks();
  unsecuredActionsClient = new UnsecuredActionsClient({
    actionExecutor,
    internalSavedObjectsRepository,
    executionEnqueuer,
    logger,
  });
});

describe('execute()', () => {
  test('throws error when executing action with not allowed requester id', async () => {
    await expect(
      unsecuredActionsClient.execute({
        requesterId: 'badId',
        id: '1',
        spaceId: 'default',
        params: {
          name: 'my name',
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"\\"badId\\" feature is not allow-listed for UnsecuredActionsClient access."`
    );
  });

  test('calls the actionExecutor with the appropriate parameters', async () => {
    const actionId = uuidv4();
    actionExecutor.executeUnsecured.mockResolvedValue({ status: 'ok', actionId });
    await expect(
      unsecuredActionsClient.execute({
        requesterId: 'background_task',
        id: actionId,
        spaceId: 'default',
        params: {
          name: 'my name',
        },
      })
    ).resolves.toMatchObject({ status: 'ok', actionId });

    expect(actionExecutor.executeUnsecured).toHaveBeenCalledWith({
      actionId,
      params: {
        name: 'my name',
      },
      spaceId: 'default',
      actionExecutionId: expect.any(String),
    });
    expect(logger.warn).toHaveBeenCalledWith(
      `Calling "execute" in UnsecuredActionsClient without any relatedSavedObjects data. Consider including this for traceability.`
    );
  });

  test('injects source using related saved objects task info if provided', async () => {
    const actionId = uuidv4();
    actionExecutor.executeUnsecured.mockResolvedValue({ status: 'ok', actionId });

    await expect(
      unsecuredActionsClient.execute({
        requesterId: 'background_task',
        id: actionId,
        params: {
          name: 'my name',
        },
        spaceId: 'custom',
        relatedSavedObjects: [
          {
            id: 'some-id',
            typeId: 'some-type-id',
            type: 'task',
          },
        ],
      })
    ).resolves.toMatchObject({ status: 'ok', actionId });

    expect(actionExecutor.executeUnsecured).toHaveBeenCalledWith({
      actionId,
      params: {
        name: 'my name',
      },
      spaceId: 'custom',
      source: {
        source: {
          taskId: 'some-id',
          taskType: 'some-type-id',
        },
        type: 'BACKGROUND_TASK',
      },
      relatedSavedObjects: [
        {
          id: 'some-id',
          typeId: 'some-type-id',
          type: 'task',
        },
      ],
      actionExecutionId: expect.any(String),
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('defaults to unknown if task type not provided in related saved objects', async () => {
    const actionId = uuidv4();
    actionExecutor.executeUnsecured.mockResolvedValue({ status: 'ok', actionId });

    await expect(
      unsecuredActionsClient.execute({
        requesterId: 'background_task',
        id: actionId,
        params: {
          name: 'my name',
        },
        spaceId: 'custom',
        relatedSavedObjects: [
          {
            id: 'some-id',
            type: 'task',
          },
        ],
      })
    ).resolves.toMatchObject({ status: 'ok', actionId });

    expect(actionExecutor.executeUnsecured).toHaveBeenCalledWith({
      actionId,
      params: {
        name: 'my name',
      },
      spaceId: 'custom',
      source: {
        source: {
          taskId: 'some-id',
          taskType: 'unknown',
        },
        type: 'BACKGROUND_TASK',
      },
      relatedSavedObjects: [
        {
          id: 'some-id',
          type: 'task',
        },
      ],
      actionExecutionId: expect.any(String),
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe('bulkEnqueueExecution()', () => {
  test('throws error when enqueuing execution with not allowed requester id', async () => {
    const opts = [
      {
        id: 'preconfigured1',
        params: {},
        executionId: '123abc',
      },
      {
        id: 'preconfigured2',
        params: {},
        executionId: '456def',
      },
    ];
    await expect(
      unsecuredActionsClient.bulkEnqueueExecution('badId', opts)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"\\"badId\\" feature is not allow-listed for UnsecuredActionsClient access."`
    );
  });

  test('calls the executionEnqueuer with the appropriate parameters', async () => {
    const opts = [
      {
        id: 'preconfigured1',
        params: {},
        executionId: '123abc',
      },
      {
        id: 'preconfigured2',
        params: {},
        executionId: '456def',
      },
    ];
    await expect(
      unsecuredActionsClient.bulkEnqueueExecution('functional_tester', opts)
    ).resolves.toMatchInlineSnapshot(`undefined`);

    expect(executionEnqueuer).toHaveBeenCalledWith(internalSavedObjectsRepository, opts);
  });

  test('injects source and calls the executionEnqueuer with the appropriate parameters when requester is "notifications"', async () => {
    const opts = [
      {
        id: 'preconfigured1',
        params: {},
        executionId: '123abc',
      },
      {
        id: 'preconfigured2',
        params: {},
        executionId: '456def',
      },
    ];
    await expect(
      unsecuredActionsClient.bulkEnqueueExecution('notifications', opts)
    ).resolves.toMatchInlineSnapshot(`undefined`);

    const optsWithSource = opts.map((opt) => ({
      ...opt,
      source: asNotificationExecutionSource({ connectorId: opt.id, requesterId: 'notifications' }),
    }));
    expect(executionEnqueuer).toHaveBeenCalledWith(internalSavedObjectsRepository, optsWithSource);
  });
});
