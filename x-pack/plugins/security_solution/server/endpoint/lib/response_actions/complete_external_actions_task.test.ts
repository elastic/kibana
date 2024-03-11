/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TITLE,
  COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE,
  CompleteExternalResponseActionsTask,
} from './complete_external_actions_task';
import { createMockEndpointAppContext } from '../../mocks';

describe('CompleteExternalActionsTask class', () => {
  let endpointAppContextMock: ReturnType<typeof createMockEndpointAppContext>;
  let taskInstance: CompleteExternalResponseActionsTask;

  beforeEach(() => {
    endpointAppContextMock = createMockEndpointAppContext();
    taskInstance = new CompleteExternalResponseActionsTask({
      endpointAppContext: endpointAppContextMock,
    });

    endpointAppContextMock.experimentalFeatures = {
      ...endpointAppContextMock.experimentalFeatures,
      responseActionsSentinelOneV2Enabled: true,
    };
  });

  describe('##setup()', () => {
    let taskManagerSetupContractMock: ReturnType<typeof taskManagerMock.createSetup>;

    beforeEach(() => {
      taskManagerSetupContractMock = taskManagerMock.createSetup();
    });

    it('should register task with task manager', async () => {
      await taskInstance.setup({ taskManager: taskManagerSetupContractMock });

      expect(taskManagerSetupContractMock.registerTaskDefinitions).toHaveBeenCalledWith({
        [COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE]: {
          title: COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TITLE,
          timeout: '20m',
          createTaskRunner: expect.any(Function),
        },
      });
    });

    it('should NOT register task with task manager if feature flag is disabled', async () => {
      endpointAppContextMock.experimentalFeatures = {
        ...endpointAppContextMock.experimentalFeatures,
        responseActionsSentinelOneV2Enabled: false,
      };
      await taskInstance.setup({ taskManager: taskManagerSetupContractMock });

      expect(taskManagerSetupContractMock.registerTaskDefinitions).not.toHaveBeenCalled();
    });

    it('should use timeout value from server config', async () => {
      endpointAppContextMock.serverConfig = {
        ...endpointAppContextMock.serverConfig,
        completeExternalResponseActionsTaskTimeout: '1000s',
      };
      await taskInstance.setup({ taskManager: taskManagerSetupContractMock });

      expect(taskManagerSetupContractMock.registerTaskDefinitions).toHaveBeenCalledWith({
        [COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE]: {
          title: COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TITLE,
          timeout: '1000s',
          createTaskRunner: expect.any(Function),
        },
      });
    });
  });

  describe('#start()', () => {
    it.todo('should schedule task with task manager');

    it.todo('should NOT schedule task if feature flag is disabled');
  });

  describe('#stop()', () => {
    it.todo('should remove task definition from task manager');
  });
});
