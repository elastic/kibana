/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISavedObjectsRepository } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { registerActionsUsageCollector } from './actions_usage_collector';
import { ActionTypeRegistry } from '../action_type_registry';
import { taskManagerMock } from '../../../task_manager/server/task_manager.mock';
import { savedObjectsRepositoryMock } from '../../../../../src/core/server/mocks';
import { TaskRunnerFactory, ActionExecutor } from '../lib';
import { configUtilsMock } from '../actions_config.mock';

const mockTaskManager = taskManagerMock.setup();
const mockTaskManagerStart = taskManagerMock.start();
const actionTypeRegistryParams = {
  taskManager: mockTaskManager,
  taskRunnerFactory: new TaskRunnerFactory(
    new ActionExecutor({ isESOUsingEphemeralEncryptionKey: false })
  ),
  actionsConfigUtils: configUtilsMock,
};

beforeEach(() => jest.resetAllMocks());

describe('registerActionsUsageCollector', () => {
  let usageCollectionMock: jest.Mocked<UsageCollectionSetup>;
  let savedObjects: ISavedObjectsRepository;
  let actionTypeRegistry: ActionTypeRegistry;
  beforeEach(() => {
    savedObjects = savedObjectsRepositoryMock.create();
    actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    usageCollectionMock = ({
      makeUsageCollector: jest.fn(),
      registerCollector: jest.fn(),
    } as unknown) as jest.Mocked<UsageCollectionSetup>;
  });

  it('should call registerCollector', () => {
    registerActionsUsageCollector(usageCollectionMock, mockTaskManagerStart);
    expect(usageCollectionMock.registerCollector).toHaveBeenCalledTimes(1);
  });

  it('should call makeUsageCollector with type = actions', () => {
    registerActionsUsageCollector(usageCollectionMock, mockTaskManagerStart);
    expect(usageCollectionMock.makeUsageCollector).toHaveBeenCalledTimes(1);
    expect(usageCollectionMock.makeUsageCollector.mock.calls[0][0].type).toBe('actions');
  });
});
