/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';

import { SavedObjectsErrorHelpers } from 'src/core/server';

import type {
  AgentPolicy,
  FullAgentPolicy,
  NewAgentPolicy,
  PreconfiguredAgentPolicy,
} from '../types';

import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../constants';

import { agentPolicyService } from './agent_policy';
import { agentPolicyUpdateEventHandler } from './agent_policy_update';

import { getAgentsByKuery } from './agents';
import { packagePolicyService } from './package_policy';
import { appContextService } from './app_context';
import { outputService } from './output';
import { getFullAgentPolicy } from './agent_policies';

function getSavedObjectMock(agentPolicyAttributes: any) {
  const mock = savedObjectsClientMock.create();
  mock.get.mockImplementation(async (type: string, id: string) => {
    return {
      type,
      id,
      references: [],
      attributes: agentPolicyAttributes as AgentPolicy,
    };
  });
  mock.find.mockImplementation(async (options) => {
    return {
      saved_objects: [
        {
          id: '93f74c0-e876-11ea-b7d3-8b2acec6f75c',
          attributes: {
            fleet_server_hosts: ['http://fleetserver:8220'],
          },
          type: 'ingest_manager_settings',
          score: 1,
          references: [],
        },
      ],
      total: 1,
      page: 1,
      per_page: 1,
    };
  });

  return mock;
}

jest.mock('./output');
jest.mock('./agent_policy_update');
jest.mock('./agents');
jest.mock('./package_policy');
jest.mock('./app_context');
jest.mock('./agent_policies/full_agent_policy');
jest.mock('uuid/v5');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
const mockedOutputService = outputService as jest.Mocked<typeof outputService>;
const mockedGetFullAgentPolicy = getFullAgentPolicy as jest.Mock<
  ReturnType<typeof getFullAgentPolicy>
>;

function getAgentPolicyUpdateMock() {
  return agentPolicyUpdateEventHandler as unknown as jest.Mock<
    typeof agentPolicyUpdateEventHandler
  >;
}

function getAgentPolicyCreateMock() {
  const soClient = savedObjectsClientMock.create();
  soClient.create.mockImplementation(async (type, attributes) => {
    return {
      attributes: attributes as unknown as NewAgentPolicy,
      id: 'mocked',
      type: 'mocked',
      references: [],
    };
  });
  return soClient;
}
describe('agent policy', () => {
  beforeEach(() => {
    getAgentPolicyUpdateMock().mockClear();
  });

  describe('create', () => {
    it('is_managed present and false by default', async () => {
      // ignore unrelated unique name constraint
      agentPolicyService.requireUniqueName = async () => {};
      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      await expect(
        agentPolicyService.create(soClient, esClient, {
          name: 'No is_managed provided',
          namespace: 'default',
        })
      ).resolves.toHaveProperty('is_managed', false);

      const [, attributes] = soClient.create.mock.calls[0];
      expect(attributes).toHaveProperty('is_managed', false);
    });

    it('should set is_managed property, if given', async () => {
      // ignore unrelated unique name constraint
      agentPolicyService.requireUniqueName = async () => {};
      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      await expect(
        agentPolicyService.create(soClient, esClient, {
          name: 'is_managed: true provided',
          namespace: 'default',
          is_managed: true,
        })
      ).resolves.toHaveProperty('is_managed', true);

      const [, attributes] = soClient.create.mock.calls[0];
      expect(attributes).toHaveProperty('is_managed', true);
    });
  });

  describe('delete', () => {
    let soClient: ReturnType<typeof savedObjectsClientMock.create>;
    let esClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>['asInternalUser'];

    beforeEach(() => {
      soClient = getSavedObjectMock({ revision: 1, package_policies: ['package-1'] });
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      (getAgentsByKuery as jest.Mock).mockResolvedValue({
        agents: [],
        total: 0,
        page: 1,
        perPage: 10,
      });

      (packagePolicyService.delete as jest.Mock).mockResolvedValue([
        {
          id: 'package-1',
        },
      ]);
    });

    it('should run package policy delete external callbacks', async () => {
      await agentPolicyService.delete(soClient, esClient, 'mocked');
      expect(packagePolicyService.runDeleteExternalCallbacks).toHaveBeenCalledWith([
        { id: 'package-1' },
      ]);
    });
  });

  describe('bumpRevision', () => {
    it('should call agentPolicyUpdateEventHandler with updated event once', async () => {
      const soClient = getSavedObjectMock({
        revision: 1,
        monitoring_enabled: ['metrics'],
      });
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      await agentPolicyService.bumpRevision(soClient, esClient, 'agent-policy');

      expect(agentPolicyUpdateEventHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('bumpAllAgentPolicies', () => {
    it('should call agentPolicyUpdateEventHandler with updated event once', async () => {
      const soClient = getSavedObjectMock({
        revision: 1,
        monitoring_enabled: ['metrics'],
      });
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      await agentPolicyService.bumpAllAgentPolicies(soClient, esClient, undefined);

      expect(agentPolicyUpdateEventHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('bumpAllAgentPoliciesForOutput', () => {
    it('should call agentPolicyUpdateEventHandler with updated event once', async () => {
      const soClient = getSavedObjectMock({
        revision: 1,
        monitoring_enabled: ['metrics'],
      });
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      await agentPolicyService.bumpAllAgentPoliciesForOutput(soClient, esClient, 'output-id-123');

      expect(agentPolicyUpdateEventHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeOutputFromAll', () => {
    let mockedAgentPolicyServiceUpdate: jest.SpyInstance<
      ReturnType<typeof agentPolicyService['update']>
    >;
    beforeEach(() => {
      mockedAgentPolicyServiceUpdate = jest
        .spyOn(agentPolicyService, 'update')
        .mockResolvedValue({} as any);
    });

    afterEach(() => {
      mockedAgentPolicyServiceUpdate.mockRestore();
    });
    it('should update policies using deleted output', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      soClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'test1',
            attributes: {
              data_output_id: 'output-id-123',
              monitoring_output_id: 'output-id-another-output',
            },
          },
          {
            id: 'test2',
            attributes: {
              data_output_id: 'output-id-another-output',
              monitoring_output_id: 'output-id-123',
            },
          },
        ],
      } as any);

      await agentPolicyService.removeOutputFromAll(soClient, esClient, 'output-id-123');

      expect(mockedAgentPolicyServiceUpdate).toHaveBeenCalledTimes(2);
      expect(mockedAgentPolicyServiceUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'test1',
        { data_output_id: null, monitoring_output_id: 'output-id-another-output' }
      );
      expect(mockedAgentPolicyServiceUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'test2',
        { data_output_id: 'output-id-another-output', monitoring_output_id: null }
      );
    });
  });

  describe('update', () => {
    it('should update is_managed property, if given', async () => {
      // ignore unrelated unique name constraint
      agentPolicyService.requireUniqueName = async () => {};
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      soClient.get.mockResolvedValue({
        attributes: {},
        id: 'mocked',
        type: 'mocked',
        references: [],
      });
      await agentPolicyService.update(soClient, esClient, 'mocked', {
        name: 'mocked',
        namespace: 'default',
        is_managed: false,
      });
      // soClient.update is called with updated values
      let calledWith = soClient.update.mock.calls[0];
      expect(calledWith[2]).toHaveProperty('is_managed', false);

      await agentPolicyService.update(soClient, esClient, 'mocked', {
        name: 'is_managed: true provided',
        namespace: 'default',
        is_managed: true,
      });
      // soClient.update is called with updated values
      calledWith = soClient.update.mock.calls[1];
      expect(calledWith[2]).toHaveProperty('is_managed', true);
    });
  });

  describe('deployPolicy', () => {
    beforeEach(() => {
      mockedGetFullAgentPolicy.mockReset();
    });
    it('should not create a .fleet-policy document if we cannot get the full policy', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      mockedAppContextService.getInternalUserESClient.mockReturnValue(esClient);
      mockedOutputService.getDefaultDataOutputId.mockResolvedValue('default-output');
      mockedGetFullAgentPolicy.mockResolvedValue(null);

      soClient.get.mockResolvedValue({
        attributes: {},
        id: 'policy123',
        type: 'mocked',
        references: [],
      });
      await agentPolicyService.deployPolicy(soClient, 'policy123');

      expect(esClient.create).not.toBeCalled();
    });

    it('should create a .fleet-policy document if we can get the full policy', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      mockedAppContextService.getInternalUserESClient.mockReturnValue(esClient);
      mockedOutputService.getDefaultDataOutputId.mockResolvedValue('default-output');
      mockedGetFullAgentPolicy.mockResolvedValue({
        id: 'policy123',
        revision: 1,
        inputs: [
          {
            id: 'input-123',
          },
        ],
      } as FullAgentPolicy);

      soClient.get.mockResolvedValue({
        attributes: {},
        id: 'policy123',
        type: 'mocked',
        references: [],
      });
      await agentPolicyService.deployPolicy(soClient, 'policy123');

      expect(esClient.create).toBeCalledWith(
        expect.objectContaining({
          index: '.fleet-policies',
          body: expect.objectContaining({
            '@timestamp': expect.anything(),
            data: { id: 'policy123', inputs: [{ id: 'input-123' }], revision: 1 },
            default_fleet_server: false,
            policy_id: 'policy123',
            revision_idx: 1,
          }),
        })
      );
    });

    describe('ensurePreconfiguredAgentPolicy', () => {
      it('should use preconfigured id if provided for policy', async () => {
        const soClient = savedObjectsClientMock.create();
        const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

        const preconfiguredAgentPolicy: PreconfiguredAgentPolicy = {
          id: 'my-unique-id',
          name: 'My Preconfigured Policy',
          package_policies: [
            {
              name: 'my-package-policy',
              id: 'my-package-policy-id',
              package: {
                name: 'test-package',
              },
            },
          ],
        };

        soClient.find.mockResolvedValueOnce({ total: 0, saved_objects: [], page: 1, per_page: 10 });
        soClient.get.mockRejectedValueOnce(SavedObjectsErrorHelpers.createGenericNotFoundError());

        soClient.create.mockResolvedValueOnce({
          id: 'my-unique-id',
          type: AGENT_POLICY_SAVED_OBJECT_TYPE,
          attributes: {},
          references: [],
        });

        await agentPolicyService.ensurePreconfiguredAgentPolicy(
          soClient,
          esClient,
          preconfiguredAgentPolicy
        );

        expect(soClient.create).toHaveBeenCalledWith(
          AGENT_POLICY_SAVED_OBJECT_TYPE,
          expect.anything(),
          expect.objectContaining({ id: 'my-unique-id' })
        );
      });
    });
  });
});
