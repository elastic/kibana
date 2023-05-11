/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { securityMock } from '@kbn/security-plugin/server/mocks';

import { PackagePolicyRestrictionRelatedError, FleetUnauthorizedError } from '../errors';
import type {
  AgentPolicy,
  FullAgentPolicy,
  NewAgentPolicy,
  PreconfiguredAgentPolicy,
} from '../types';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../constants';

import { AGENT_POLICY_INDEX } from '../../common';

import { agentPolicyService } from './agent_policy';
import { agentPolicyUpdateEventHandler } from './agent_policy_update';

import { getAgentsByKuery } from './agents';
import { packagePolicyService } from './package_policy';
import { appContextService } from './app_context';
import { outputService } from './output';
import { downloadSourceService } from './download_source';
import { getFullAgentPolicy } from './agent_policies';
import * as outputsHelpers from './agent_policies/outputs_helpers';
import { auditLoggingService } from './audit_logging';
import { licenseService } from './license';

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
jest.mock('./download_source');
jest.mock('./agent_policy_update');
jest.mock('./agents');
jest.mock('./package_policy');
jest.mock('./app_context');
jest.mock('./audit_logging');
jest.mock('./agent_policies/full_agent_policy');
jest.mock('./agent_policies/outputs_helpers');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;
const mockOutputsHelpers = outputsHelpers as jest.Mocked<typeof outputsHelpers>;
const mockedOutputService = outputService as jest.Mocked<typeof outputService>;
const mockedDownloadSourceService = downloadSourceService as jest.Mocked<
  typeof downloadSourceService
>;
const mockedPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;

const mockedGetFullAgentPolicy = getFullAgentPolicy as jest.Mock<
  ReturnType<typeof getFullAgentPolicy>
>;

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
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    it('is_managed present and false by default', async () => {
      const soClient = getAgentPolicyCreateMock();
      // ignore unrelated unique name constraint
      agentPolicyService.requireUniqueName = async () => {};
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

    it('should call audit logger', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const soClient = savedObjectsClientMock.create();

      soClient.find.mockResolvedValueOnce({
        total: 0,
        saved_objects: [],
        per_page: 0,
        page: 1,
      });

      soClient.create.mockResolvedValueOnce({
        id: 'test-agent-policy',
        type: AGENT_POLICY_SAVED_OBJECT_TYPE,
        attributes: {},
        references: [],
      });

      mockOutputsHelpers.validateOutputForPolicy.mockResolvedValueOnce(undefined);

      await agentPolicyService.create(
        soClient,
        esClient,
        {
          name: 'test',
          namespace: 'default',
        },
        { id: 'test-agent-policy' }
      );

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'create',
        id: 'test-agent-policy',
        savedObjectType: AGENT_POLICY_SAVED_OBJECT_TYPE,
      });
    });

    it('should throw FleetUnauthorizedError if is_protected=true with insufficient license', () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(false);

      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      expect(
        agentPolicyService.create(soClient, esClient, {
          name: 'test',
          namespace: 'default',
          is_protected: true,
        })
      ).rejects.toThrowError(
        new FleetUnauthorizedError('Tamper protection requires Platinum license')
      );
    });

    it('should not throw FleetUnauthorizedError if is_protected=false with insufficient license', () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(false);

      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      expect(
        agentPolicyService.create(soClient, esClient, {
          name: 'test',
          namespace: 'default',
        })
      ).resolves.not.toThrowError(
        new FleetUnauthorizedError('Tamper protection requires Platinum license')
      );
    });
  });

  // TODO: Add more test coverage to `get` service method
  describe('get', () => {
    it('should call audit logger', async () => {
      const soClient = savedObjectsClientMock.create();

      soClient.get.mockResolvedValueOnce({
        id: 'test-agent-policy',
        attributes: {},
        references: [],
        type: AGENT_POLICY_SAVED_OBJECT_TYPE,
      });

      await agentPolicyService.get(soClient, 'test-agent-policy', false);

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toBeCalledWith({
        action: 'get',
        id: 'test-agent-policy',
        savedObjectType: AGENT_POLICY_SAVED_OBJECT_TYPE,
      });
    });
  });

  describe('getByIDs', () => {
    it('should call audit logger', async () => {
      const soClient = savedObjectsClientMock.create();

      soClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'test-agent-policy-1',
            attributes: {},
            references: [],
            type: AGENT_POLICY_SAVED_OBJECT_TYPE,
          },
          {
            id: 'test-agent-policy-2',
            attributes: {},
            references: [],
            type: AGENT_POLICY_SAVED_OBJECT_TYPE,
          },
        ],
      });

      await agentPolicyService.getByIDs(soClient, ['test-agent-policy-1', 'test-agent-policy-2']);

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(1, {
        action: 'get',
        id: 'test-agent-policy-1',
        savedObjectType: AGENT_POLICY_SAVED_OBJECT_TYPE,
      });

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(2, {
        action: 'get',
        id: 'test-agent-policy-2',
        savedObjectType: AGENT_POLICY_SAVED_OBJECT_TYPE,
      });
    });
  });

  describe('list', () => {
    it('should call audit logger', async () => {
      const soClient = savedObjectsClientMock.create();

      soClient.find.mockResolvedValueOnce({
        total: 2,
        saved_objects: [
          {
            id: 'test-agent-policy-1',
            attributes: {},
            references: [],
            type: AGENT_POLICY_SAVED_OBJECT_TYPE,
            score: 0,
          },
          {
            id: 'test-agent-policy-2',
            attributes: {},
            references: [],
            type: AGENT_POLICY_SAVED_OBJECT_TYPE,
            score: 0,
          },
        ],
        per_page: 0,
        page: 1,
      });

      await agentPolicyService.list(soClient, {
        page: 1,
        perPage: 10,
        kuery: '',
      });

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(1, {
        action: 'find',
        id: 'test-agent-policy-1',
        savedObjectType: AGENT_POLICY_SAVED_OBJECT_TYPE,
      });

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenNthCalledWith(2, {
        action: 'find',
        id: 'test-agent-policy-2',
        savedObjectType: AGENT_POLICY_SAVED_OBJECT_TYPE,
      });
    });
  });

  describe('delete', () => {
    let soClient: ReturnType<typeof savedObjectsClientMock.create>;
    let esClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>['asInternalUser'];

    beforeEach(() => {
      soClient = getSavedObjectMock({ revision: 1, package_policies: ['package-1'] });
      mockedPackagePolicyService.findAllForAgentPolicy.mockReturnValue([
        {
          id: 'package-1',
        },
      ] as any);
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      (getAgentsByKuery as jest.Mock).mockResolvedValue({
        agents: [],
        total: 0,
        page: 1,
        perPage: 10,
      });

      mockedPackagePolicyService.delete.mockResolvedValue([
        {
          id: 'package-1',
        } as any,
      ]);
    });

    it('should throw error for agent policy which has managed package policy', async () => {
      mockedPackagePolicyService.findAllForAgentPolicy.mockReturnValue([
        {
          id: 'package-1',
          is_managed: true,
        },
      ] as any);
      try {
        await agentPolicyService.delete(soClient, esClient, 'mocked');
      } catch (e) {
        expect(e.message).toEqual(
          new PackagePolicyRestrictionRelatedError(
            `Cannot delete agent policy mocked that contains managed package policies`
          ).message
        );
      }
    });

    it('should call audit logger', async () => {
      await agentPolicyService.delete(soClient, esClient, 'mocked');

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'delete',
        id: 'mocked',
        savedObjectType: AGENT_POLICY_SAVED_OBJECT_TYPE,
      });
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

      expect(soClient.bulkUpdate).toHaveBeenCalledWith([
        {
          attributes: expect.objectContaining({
            fleet_server_hosts: ['http://fleetserver:8220'],
            revision: NaN,
            updated_by: 'system',
          }),
          id: '93f74c0-e876-11ea-b7d3-8b2acec6f75c',
          references: [],
          score: 1,
          type: 'ingest_manager_settings',
        },
      ]);

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

  describe('removeDefaultSourceFromAll', () => {
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

    it('should update policies using deleted download source host', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      mockedDownloadSourceService.getDefaultDownloadSourceId.mockResolvedValue(
        'default-download-source-id'
      );
      soClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'test-ds-1',
            attributes: {
              download_source_id: 'ds-id-1',
            },
          },
          {
            id: 'test-ds-2',
            attributes: {
              download_source_id: 'default-download-source-id',
            },
          },
        ],
      } as any);

      await agentPolicyService.removeDefaultSourceFromAll(
        soClient,
        esClient,
        'default-download-source-id'
      );

      expect(mockedAgentPolicyServiceUpdate).toHaveBeenCalledTimes(2);
      expect(mockedAgentPolicyServiceUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'test-ds-1',
        { download_source_id: 'ds-id-1' }
      );
      expect(mockedAgentPolicyServiceUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'test-ds-2',
        { download_source_id: null }
      );
    });
  });

  describe('bumpAllAgentPoliciesForDownloadSource', () => {
    it('should call agentPolicyUpdateEventHandler with updated event once', async () => {
      const soClient = getSavedObjectMock({
        revision: 1,
        monitoring_enabled: ['metrics'],
      });
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      await agentPolicyService.bumpAllAgentPoliciesForDownloadSource(
        soClient,
        esClient,
        'test-id-1'
      );

      expect(agentPolicyUpdateEventHandler).toHaveBeenCalledTimes(1);
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

    it('should call audit logger', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      soClient.get.mockResolvedValue({
        attributes: {},
        references: [],
        id: 'test-agent-policy',
        type: AGENT_POLICY_SAVED_OBJECT_TYPE,
      });

      await agentPolicyService.update(soClient, esClient, 'test-agent-policy', {
        name: 'Test Agent Policy',
        namespace: 'default',
        is_managed: false,
      });

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'update',
        id: 'test-agent-policy',
        savedObjectType: AGENT_POLICY_SAVED_OBJECT_TYPE,
      });
    });

    it('should throw FleetUnauthorizedError if is_protected=true with insufficient license', () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(false);

      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      soClient.get.mockResolvedValue({
        attributes: {},
        id: 'test-id',
        type: 'mocked',
        references: [],
      });

      expect(
        agentPolicyService.update(soClient, esClient, 'test-id', {
          name: 'test',
          namespace: 'default',
          is_protected: true,
        })
      ).rejects.toThrowError(
        new FleetUnauthorizedError('Tamper protection requires Platinum license')
      );
    });

    it('should not throw FleetUnauthorizedError if is_protected=false with insufficient license', () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(false);

      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      soClient.get.mockResolvedValue({
        attributes: {},
        id: 'test-id',
        type: 'mocked',
        references: [],
      });

      expect(
        agentPolicyService.update(soClient, esClient, 'test-id', {
          name: 'test',
          namespace: 'default',
        })
      ).resolves.not.toThrowError(
        new FleetUnauthorizedError('Tamper protection requires Platinum license')
      );
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

      const mockFleetServerHost = {
        id: 'id1',
        name: 'fleet server 1',
        host_urls: ['https://host1.fr:8220', 'https://host2-with-a-longer-name.fr:8220'],
        is_default: false,
        is_preconfigured: false,
      };
      soClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'existing-fleet-server-host',
            type: 'fleet-fleet-server-host',
            score: 1,
            references: [],
            version: '1.0.0',
            attributes: mockFleetServerHost,
          },
        ],
        page: 0,
        per_page: 0,
        total: 0,
      });

      const mockSo = {
        attributes: {},
        id: 'policy123',
        type: 'mocked',
        references: [],
      };
      soClient.get.mockResolvedValue(mockSo);
      soClient.bulkGet.mockResolvedValue({
        saved_objects: [mockSo],
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

      const mockSo = {
        attributes: {},
        id: 'policy123',
        type: 'mocked',
        references: [],
      };
      soClient.get.mockResolvedValue(mockSo);
      const mockFleetServerHost = {
        id: 'id1',
        name: 'fleet server 1',
        host_urls: ['https://host1.fr:8220', 'https://host2-with-a-longer-name.fr:8220'],
        is_default: false,
        is_preconfigured: false,
      };
      soClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'existing-fleet-server-host',
            type: 'fleet-fleet-server-host',
            score: 1,
            references: [],
            version: '1.0.0',
            attributes: mockFleetServerHost,
          },
        ],
        page: 0,
        per_page: 0,
        total: 0,
      });
      soClient.bulkGet.mockResolvedValue({
        saved_objects: [mockSo],
      });
      await agentPolicyService.deployPolicy(soClient, 'policy123');

      expect(esClient.bulk).toBeCalledWith(
        expect.objectContaining({
          index: AGENT_POLICY_INDEX,
          body: [
            expect.objectContaining({
              index: {
                _id: expect.anything(),
              },
            }),
            expect.objectContaining({
              '@timestamp': expect.anything(),
              data: { id: 'policy123', inputs: [{ id: 'input-123' }], revision: 1 },
              default_fleet_server: false,
              policy_id: 'policy123',
              revision_idx: 1,
            }),
          ],
          refresh: 'wait_for',
        })
      );
    });

    it('should call audit logger', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const soClient = savedObjectsClientMock.create();

      mockedAppContextService.getInternalUserESClient.mockReturnValue(esClient);
      mockedOutputService.getDefaultDataOutputId.mockResolvedValueOnce('default-output');

      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            attributes: {},
            references: [],
            id: 'test-agent-policy',
            type: AGENT_POLICY_SAVED_OBJECT_TYPE,
          },
        ],
      });

      await agentPolicyService.deployPolicy(soClient, 'test-agent-policy');

      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
        message: `User deploying policy [id=test-agent-policy]`,
      });
    });
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

  describe('getInactivityTimeouts', () => {
    const createPolicySO = (id: string, inactivityTimeout: number) => ({
      id,
      type: AGENT_POLICY_SAVED_OBJECT_TYPE,
      attributes: { inactivity_timeout: inactivityTimeout },
      references: [],
      score: 1,
    });

    const createMockSoClientThatReturns = (policies: Array<ReturnType<typeof createPolicySO>>) => {
      const mockSoClient = savedObjectsClientMock.create();
      mockSoClient.find.mockResolvedValue({
        saved_objects: policies,
        page: 1,
        per_page: 10,
        total: policies.length,
      });
      return mockSoClient;
    };

    it('should return empty array if no policies with inactivity timeouts', async () => {
      const mockSoClient = createMockSoClientThatReturns([]);
      expect(await agentPolicyService.getInactivityTimeouts(mockSoClient)).toEqual([]);
    });
    it('should return single inactivity timeout', async () => {
      const mockSoClient = createMockSoClientThatReturns([createPolicySO('policy1', 1000)]);

      expect(await agentPolicyService.getInactivityTimeouts(mockSoClient)).toEqual([
        { inactivityTimeout: 1000, policyIds: ['policy1'] },
      ]);
    });
    it('should return group policies with same inactivity timeout', async () => {
      const mockSoClient = createMockSoClientThatReturns([
        createPolicySO('policy1', 1000),
        createPolicySO('policy2', 1000),
      ]);

      expect(await agentPolicyService.getInactivityTimeouts(mockSoClient)).toEqual([
        { inactivityTimeout: 1000, policyIds: ['policy1', 'policy2'] },
      ]);
    });
    it('should return handle single and grouped policies', async () => {
      const mockSoClient = createMockSoClientThatReturns([
        createPolicySO('policy1', 1000),
        createPolicySO('policy2', 1000),
        createPolicySO('policy3', 2000),
      ]);

      expect(await agentPolicyService.getInactivityTimeouts(mockSoClient)).toEqual([
        { inactivityTimeout: 1000, policyIds: ['policy1', 'policy2'] },
        { inactivityTimeout: 2000, policyIds: ['policy3'] },
      ]);
    });
  });

  describe('deleteFleetServerPoliciesForPolicyId', () => {
    it('should call audit logger', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      esClient.deleteByQuery.mockResolvedValueOnce({} as any);

      await agentPolicyService.deleteFleetServerPoliciesForPolicyId(esClient, 'test-agent-policy');

      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
        message: 'User deleting policy [id=test-agent-policy]',
      });
    });
  });
});
