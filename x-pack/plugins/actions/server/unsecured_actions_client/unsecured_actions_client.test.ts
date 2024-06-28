/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
} from '@kbn/core/server/mocks';
import { asNotificationExecutionSource } from '../lib';
import { actionExecutorMock } from '../lib/action_executor.mock';
import { UnsecuredActionsClient } from './unsecured_actions_client';
import { Logger } from '@kbn/core/server';
import { getAllUnsecured } from '../application/connector/methods/get_all/get_all';

jest.mock('../application/connector/methods/get_all/get_all');

const mockGetAllUnsecured = getAllUnsecured as jest.MockedFunction<typeof getAllUnsecured>;

const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const actionExecutor = actionExecutorMock.create();
const executionEnqueuer = jest.fn();
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const clusterClient = elasticsearchServiceMock.createClusterClient();
const inMemoryConnectors = [
  {
    id: 'testPreconfigured',
    actionTypeId: '.slack',
    secrets: {},
    isPreconfigured: true,
    isDeprecated: false,
    isSystemAction: false,
    name: 'test',
    config: {
      foo: 'bar',
    },
  },
  /**
   * System actions will not
   * be returned from getAllUnsecured
   */
  {
    id: 'system-connector-.cases',
    actionTypeId: '.cases',
    name: 'System action: .cases',
    config: {},
    secrets: {},
    isDeprecated: false,
    isMissingSecrets: false,
    isPreconfigured: false,
    isSystemAction: true,
  },
];
let unsecuredActionsClient: UnsecuredActionsClient;

beforeEach(() => {
  jest.resetAllMocks();
  unsecuredActionsClient = new UnsecuredActionsClient({
    actionExecutor,
    clusterClient,
    executionEnqueuer,
    inMemoryConnectors,
    internalSavedObjectsRepository,
    kibanaIndices: ['.kibana'],
    logger,
  });
});

describe('getAll()', () => {
  test('calls getAllUnsecured library method with appropriate parameters', async () => {
    const expectedResult = [
      {
        actionTypeId: 'test',
        id: '1',
        name: 'test',
        isMissingSecrets: false,
        config: { foo: 'bar' },
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: false,
        referencedByCount: 6,
      },
      {
        id: 'testPreconfigured',
        actionTypeId: '.slack',
        name: 'test',
        isPreconfigured: true,
        isSystemAction: false,
        isDeprecated: false,
        referencedByCount: 2,
      },
    ];
    mockGetAllUnsecured.mockResolvedValueOnce(expectedResult);
    const result = await unsecuredActionsClient.getAll('default');
    expect(result).toEqual(expectedResult);
    expect(mockGetAllUnsecured).toHaveBeenCalledWith({
      esClient: clusterClient.asInternalUser,
      inMemoryConnectors,
      kibanaIndices: ['.kibana'],
      logger,
      internalSavedObjectsRepository,
      spaceId: 'default',
    });
  });

  test('throws error if getAllUnsecured throws errors', async () => {
    mockGetAllUnsecured.mockImplementationOnce(() => {
      throw new Error('failfail');
    });
    await expect(
      unsecuredActionsClient.getAll('customSpace')
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"failfail"`);
    expect(mockGetAllUnsecured).toHaveBeenCalledWith({
      esClient: clusterClient.asInternalUser,
      inMemoryConnectors,
      kibanaIndices: ['.kibana'],
      logger,
      internalSavedObjectsRepository,
      spaceId: 'customSpace',
    });
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
