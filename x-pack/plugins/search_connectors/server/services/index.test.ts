/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import {
  ElasticsearchClientMock,
  elasticsearchClientMock,
} from '@kbn/core-elasticsearch-client-server-mocks';
import { AgentlessConnectorsInfraService } from '.';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { MockedLogger, loggerMock } from '@kbn/logging-mocks';
import {
  createPackagePolicyServiceMock,
  createMockAgentPolicyService,
} from '@kbn/fleet-plugin/server/mocks';
import { AgentPolicyServiceInterface, PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { PackagePolicy, PackagePolicyInput } from '@kbn/fleet-plugin/common';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';

describe('AgentlessConnectorsInfraService', () => {
  let soClient: SavedObjectsClientContract;
  let esClient: ElasticsearchClientMock;
  let packagePolicyService: jest.Mocked<PackagePolicyClient>;
  let agentPolicyInterface: jest.Mocked<AgentPolicyServiceInterface>;
  let logger: MockedLogger;
  let service: AgentlessConnectorsInfraService;
  beforeAll(async () => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchClientMock.createClusterClient().asInternalUser;
    packagePolicyService = createPackagePolicyServiceMock();
    agentPolicyInterface = createMockAgentPolicyService();
    logger = loggerMock.create();

    service = new AgentlessConnectorsInfraService(
      soClient,
      esClient,
      packagePolicyService,
      agentPolicyInterface,
      logger
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNativeConnectors', () => {
    test('Lists only native connectors', async () => {
      const mockResult = {
        results: [
          {
            id: '00000001',
            name: 'Sharepoint Online Production Connector',
            service_type: 'sharepoint_online',
            is_native: false,
          },
          {
            id: '00000002',
            name: 'Github Connector for ACME Organisation',
            service_type: 'github',
            is_native: true,
          },
        ],
        count: 2,
      };
      esClient.transport.request.mockResolvedValue(mockResult);

      const nativeConnectors = await service.getNativeConnectors();
      expect(nativeConnectors.length).toBe(1);
      expect(nativeConnectors[0].id).toBe(mockResult.results[1].id);
      expect(nativeConnectors[0].name).toBe(mockResult.results[1].name);
      expect(nativeConnectors[0].service_type).toBe(mockResult.results[1].service_type);
    });

    test('Lists only supported service types', async () => {
      const mockResult = {
        results: [
          {
            id: '00000001',
            name: 'Sharepoint Online Production Connector',
            service_type: 'sharepoint_online',
            is_native: true,
          },
          {
            id: '00000002',
            name: 'Github Connector for ACME Organisation',
            service_type: 'github',
            is_native: true,
          },
          {
            id: '00000003',
            name: 'Connector with unexpected service_type',
            service_type: 'crawler',
            is_native: true,
          },
          {
            id: '00000004',
            name: 'Connector with no service_type',
            service_type: null,
            is_native: true,
          },
        ],
        count: 4,
      };
      esClient.transport.request.mockResolvedValue(mockResult);

      const nativeConnectors = await service.getNativeConnectors();
      expect(nativeConnectors.length).toBe(2);
      expect(nativeConnectors[0].id).toBe(mockResult.results[0].id);
      expect(nativeConnectors[0].name).toBe(mockResult.results[0].name);
      expect(nativeConnectors[0].service_type).toBe(mockResult.results[0].service_type);
      expect(nativeConnectors[1].id).toBe(mockResult.results[1].id);
      expect(nativeConnectors[1].name).toBe(mockResult.results[1].name);
      expect(nativeConnectors[1].service_type).toBe(mockResult.results[1].service_type);
    });
  });

  describe('getConnectorPackagePolicies', () => {
    const getMockPolicyFetchAllItems = (pages: PackagePolicy[][]) => {
      return {
        async *[Symbol.asyncIterator]() {
          for (const page of pages) {
            yield page;
          }
        },
      } as AsyncIterable<PackagePolicy[]>;
    };

    test('Lists only policies with expected input', async () => {
      const firstPackagePolicy = createPackagePolicyMock();
      firstPackagePolicy.id = 'this-is-package-policy-id';
      firstPackagePolicy.policy_ids = ['this-is-agent-policy-id'];
      firstPackagePolicy.inputs = [
        {
          type: 'connectors-py',
          compiled_input: {
            connector_id: '00000001',
            connector_name: 'Sharepoint Online Production Connector',
            service_type: 'sharepoint_online',
          },
        } as PackagePolicyInput,
      ];
      const secondPackagePolicy = createPackagePolicyMock();
      const thirdPackagePolicy = createPackagePolicyMock();
      thirdPackagePolicy.inputs = [
        {
          type: 'something-unsupported',
          compiled_input: {
            connector_id: '00000001',
            connector_name: 'Sharepoint Online Production Connector',
            service_type: 'sharepoint_online',
          },
        } as PackagePolicyInput,
      ];

      packagePolicyService.fetchAllItems.mockResolvedValue(
        getMockPolicyFetchAllItems([[firstPackagePolicy, secondPackagePolicy, thirdPackagePolicy]])
      );

      const policies = await service.getConnectorPackagePolicies();

      expect(policies.length).toBe(1);
      expect(policies[0].packagePolicyId).toBe(firstPackagePolicy.id);
      expect(policies[0].connectorMetadata.id).toBe(
        firstPackagePolicy.inputs[0].compiled_input.connector_id
      );
      expect(policies[0].connectorMetadata.name).toBe(
        firstPackagePolicy.inputs[0].compiled_input.connector_name
      );
      expect(policies[0].connectorMetadata.service_type).toBe(
        firstPackagePolicy.inputs[0].compiled_input.service_type
      );
      expect(policies[0].agentPolicyIds).toBe(firstPackagePolicy.policy_ids);
    });

    test('Lists policies if they are returned over multiple pages', async () => {
      const firstPackagePolicy = createPackagePolicyMock();
      firstPackagePolicy.id = 'this-is-package-policy-id';
      firstPackagePolicy.policy_ids = ['this-is-agent-policy-id'];
      firstPackagePolicy.inputs = [
        {
          type: 'connectors-py',
          compiled_input: {
            connector_id: '00000001',
            connector_name: 'Sharepoint Online Production Connector',
            service_type: 'sharepoint_online',
          },
        } as PackagePolicyInput,
      ];
      const secondPackagePolicy = createPackagePolicyMock();
      const thirdPackagePolicy = createPackagePolicyMock();
      thirdPackagePolicy.inputs = [
        {
          type: 'connectors-py',
          compiled_input: {
            connector_id: '00000003',
            connector_name: 'Sharepoint Online Production Connector',
            service_type: 'github',
          },
        } as PackagePolicyInput,
      ];

      packagePolicyService.fetchAllItems.mockResolvedValue(
        getMockPolicyFetchAllItems([
          [firstPackagePolicy],
          [secondPackagePolicy],
          [thirdPackagePolicy],
        ])
      );

      const policies = await service.getConnectorPackagePolicies();

      expect(policies.length).toBe(2);
      expect(policies[0].packagePolicyId).toBe(firstPackagePolicy.id);
      expect(policies[0].connectorMetadata.id).toBe(
        firstPackagePolicy.inputs[0].compiled_input.connector_id
      );
      expect(policies[0].connectorMetadata.name).toBe(
        firstPackagePolicy.inputs[0].compiled_input.connector_name
      );
      expect(policies[0].connectorMetadata.service_type).toBe(
        firstPackagePolicy.inputs[0].compiled_input.service_type
      );
      expect(policies[0].agentPolicyIds).toBe(firstPackagePolicy.policy_ids);

      expect(policies[1].packagePolicyId).toBe(thirdPackagePolicy.id);
      expect(policies[1].connectorMetadata.id).toBe(
        thirdPackagePolicy.inputs[0].compiled_input.connector_id
      );
      expect(policies[1].connectorMetadata.name).toBe(
        thirdPackagePolicy.inputs[0].compiled_input.connector_name
      );
      expect(policies[1].connectorMetadata.service_type).toBe(
        thirdPackagePolicy.inputs[0].compiled_input.service_type
      );
      expect(policies[1].agentPolicyIds).toBe(thirdPackagePolicy.policy_ids);
    });

    test('Skips policies that have missing fields', async () => {
      const firstPackagePolicy = createPackagePolicyMock();
      firstPackagePolicy.id = 'this-is-package-policy-id';
      firstPackagePolicy.policy_ids = ['this-is-agent-policy-id'];
      firstPackagePolicy.inputs = [
        {
          type: 'connectors-py',
          compiled_input: {
            connector_id: '00000001',
            connector_name: 'Sharepoint Online Production Connector',
          },
        } as PackagePolicyInput,
      ];
      const secondPackagePolicy = createPackagePolicyMock();
      secondPackagePolicy.inputs = [
        {
          type: 'connectors-py',
          compiled_input: {
            connector_name: 'Sharepoint Online Production Connector',
            service_type: 'github',
          },
        } as PackagePolicyInput,
      ];

      packagePolicyService.fetchAllItems.mockResolvedValue(
        getMockPolicyFetchAllItems([[firstPackagePolicy], [secondPackagePolicy]])
      );

      const policies = await service.getConnectorPackagePolicies();

      expect(policies.length).toBe(0);
    });
  });
  describe('deployConnector', () => {
    test('Raises an error if connector.id is missing', async () => {
      const connector = {
        id: '',
        name: 'something',
        service_type: 'github',
      };

      try {
        await service.deployConnector(connector);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toContain('Connector id');
      }
    });

    test('Raises an error if connector.service_type is missing', async () => {
      const connector = {
        id: '000000001',
        name: 'something',
        service_type: '',
      };

      try {
        await service.deployConnector(connector);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toContain('service_type');
      }
    });

    test('Raises an error if connector.service_type is unsupported', async () => {
      const connector = {
        id: '000000001',
        name: 'something',
        service_type: 'crawler',
      };

      try {
        await service.deployConnector(connector);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toContain('service_type');
        expect(e.message).toContain('incompatible');
      }
    });

    test('Does not swallow an error if agent policy creation failed', async () => {
      const connector = {
        id: '000000001',
        name: 'something',
        service_type: 'github',
      };
      const errorMessage = 'Failed to create an agent policy hehe';

      agentPolicyInterface.create.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      try {
        await service.deployConnector(connector);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toEqual(errorMessage);
      }
    });

    test('Does not swallow an error if package policy creation failed', async () => {
      const connector = {
        id: '000000001',
        name: 'something',
        service_type: 'github',
      };
      const errorMessage = 'Failed to create a package policy hehe';

      packagePolicyService.create.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      try {
        await service.deployConnector(connector);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toEqual(errorMessage);
      }
    });
  });
});
