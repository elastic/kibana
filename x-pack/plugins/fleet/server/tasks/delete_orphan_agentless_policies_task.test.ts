/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/task-manager-plugin/server';

import { coreMock, loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../common/constants/package_policy';

import type { PostDeletePackagePoliciesResponse } from '../../common';

import { agentPolicyService, appContextService, packagePolicyService } from '../services';
import { createAppContextStartContractMock } from '../mocks';
import { createAgentPolicyMock } from '../../common/mocks';

import type { AgentPolicy } from '../types';

import { agentlessAgentService } from '../services/agents/agentless_agent';
import { agentPolicyUpdateEventHandler } from '../services/agent_policy_update';

import {
  DELETE_AGENTLESS_POLICIES_TASK_VERSION,
  DELETED_AGENTLESS_POLICIES_TASK_TYPE,
  DeleteOrphanAgentlessPoliciesTask,
} from './delete_orphan_agentless_policies_task';

const systemMock = {
  id: 'c6d16e42-c32d-4dce-8a88-113cfe276ad1',
  name: 'system-1',
  description: '',
  namespace: 'default',
  enabled: true,
  policy_id: '93c46720-c217-11ea-9906-b5b8a21b268e',
  policy_ids: ['93c46720-c217-11ea-9906-b5b8a21b268e'],
  revision: 1,
  package: {
    name: 'system',
    title: 'System',
    version: '0.9.0',
  },
  updated_at: '2020-06-25T16:03:38.159292',
  updated_by: 'kibana',
  created_at: '2020-06-25T16:03:38.159292',
  created_by: 'kibana',
  inputs: [
    {
      config: {},
      enabled: true,
      type: 'system',
      streams: [],
    },
  ],
};
const MOCK_TASK_INSTANCE = {
  id: `${DELETED_AGENTLESS_POLICIES_TASK_TYPE}:${DELETE_AGENTLESS_POLICIES_TASK_VERSION}`,
  runAt: new Date(),
  attempts: 1,
  ownerId: '',
  status: TaskStatus.Running,
  startedAt: new Date(),
  scheduledAt: new Date(),
  retryAt: new Date(),
  params: {},
  state: {},
  taskType: DELETED_AGENTLESS_POLICIES_TASK_TYPE,
};

const mockAgentPolicy: AgentPolicy = createAgentPolicyMock({
  agents: 1,
  id: '93c46720-c217-11ea-9906-b5b8a21b268e',
  package_policies: [systemMock],
});

const deletedPackagePolicies: PostDeletePackagePoliciesResponse = [
  {
    id: 'system-1',
    success: true,
  },
];

jest.mock('../services/agent_policy_update', () => ({
  agentPolicyUpdateEventHandler: jest.fn(),
}));
describe('Delete Orphan Agentless Policies', () => {
  const { createSetup: coreSetupMock } = coreMock;
  const { createSetup: tmSetupMock, createStart: tmStartMock } = taskManagerMock;
  let mockContract: ReturnType<typeof createAppContextStartContractMock>;
  let mockTask: DeleteOrphanAgentlessPoliciesTask;
  let mockCore: ReturnType<typeof coreSetupMock>;
  let mockTaskManagerSetup: ReturnType<typeof tmSetupMock>;
  let mockCoreSetup: ReturnType<typeof coreMock.createSetup>;

  const getMockAgentPolicyFetchAllAgentPolicies = (items: AgentPolicy[]) =>
    jest.fn().mockResolvedValue(
      jest.fn(async function* () {
        yield items;
      })()
    );

  beforeEach(() => {
    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);
    mockCore = coreSetupMock();
    mockTaskManagerSetup = tmSetupMock();
    mockCoreSetup = coreMock.createSetup();
    mockTask = new DeleteOrphanAgentlessPoliciesTask({
      core: mockCore,
      taskManager: mockTaskManagerSetup,
      logFactory: loggingSystemMock.create(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Task lifecycle', () => {
    it('Should create task', async () => {
      expect(mockTask).toBeInstanceOf(DeleteOrphanAgentlessPoliciesTask);
    });

    it('Should register task', async () => {
      expect(mockTaskManagerSetup.registerTaskDefinitions).toHaveBeenCalled();
    });

    it('Should schedule task', async () => {
      const mockTaskManagerStart = tmStartMock();
      await mockTask.start({ taskManager: mockTaskManagerStart });
      expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalled();
    });
  });

  describe('Task Logic', () => {
    const runTask = async (taskInstance = MOCK_TASK_INSTANCE) => {
      const mockTaskManagerStart = tmStartMock();
      await mockTask.start({ taskManager: mockTaskManagerStart });
      const createTaskRunner =
        mockTaskManagerSetup.registerTaskDefinitions.mock.calls[0][0][
          DELETED_AGENTLESS_POLICIES_TASK_TYPE
        ].createTaskRunner;
      const taskRunner = createTaskRunner({ taskInstance });
      return taskRunner.run();
    };

    const mockAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;
    const soClient = savedObjectsClientMock.create();

    beforeEach(() => {
      mockAgentPolicyService.fetchAllAgentPolicies = getMockAgentPolicyFetchAllAgentPolicies([
        mockAgentPolicy,
      ]);
      soClient.find.mockResolvedValueOnce({
        total: 1,
        page: 1,
        per_page: 10,
        saved_objects: [
          {
            id: 'system-1',
            attributes: {},
            score: 0,
            references: [],
            type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          },
        ],
      });

      soClient.delete.mockResolvedValueOnce(systemMock);
      jest.spyOn(packagePolicyService, 'findAllForAgentPolicy').mockResolvedValueOnce([systemMock]);
      jest.spyOn(agentlessAgentService, 'deleteAgentlessAgent').mockResolvedValueOnce(undefined);
      jest.spyOn(packagePolicyService, 'delete').mockResolvedValueOnce(deletedPackagePolicies);
      jest.spyOn(soClient, 'delete').mockResolvedValueOnce(systemMock);

      (agentPolicyUpdateEventHandler as jest.Mock).mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should delete orphan agentless policies', async () => {
      await runTask();

      expect(mockAgentPolicyService.fetchAllAgentPolicies).toHaveBeenCalled();
      expect(packagePolicyService.findAllForAgentPolicy).toHaveBeenCalled();
      expect(agentPolicyUpdateEventHandler).toHaveBeenCalled();
      expect(agentlessAgentService.deleteAgentlessAgent).toHaveBeenCalled();
      expect(packagePolicyService.delete).toHaveBeenCalled();
      expect(soClient.delete).toHaveBeenCalled();
    });
  });
});
