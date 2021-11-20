/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createEndpointMetadataServiceTestContextMock,
  EndpointMetadataServiceTestContextMock,
} from './mocks';
import { elasticsearchServiceMock } from '../../../../../../../src/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ElasticsearchClientMock } from '../../../../../../../src/core/server/elasticsearch/client/mocks';
import {
  legacyMetadataSearchResponseMock,
  unitedMetadataSearchResponseMock,
} from '../../routes/metadata/support/test_support';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import {
  getESQueryHostMetadataByFleetAgentIds,
  buildUnitedIndexQuery,
} from '../../routes/metadata/query_builders';
import { EndpointError } from '../../errors';
import { HostMetadata } from '../../../../common/endpoint/types';
import { Agent } from '../../../../../fleet/common';
import { AgentPolicyServiceInterface } from '../../../../../fleet/server/services';

describe('EndpointMetadataService', () => {
  let testMockedContext: EndpointMetadataServiceTestContextMock;
  let metadataService: EndpointMetadataServiceTestContextMock['endpointMetadataService'];
  let esClient: ElasticsearchClientMock;
  let endpointDocGenerator: EndpointDocGenerator;

  beforeEach(() => {
    endpointDocGenerator = new EndpointDocGenerator('seed');
    testMockedContext = createEndpointMetadataServiceTestContextMock();
    metadataService = testMockedContext.endpointMetadataService;
    esClient = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
  });

  describe('#findHostMetadataForFleetAgents()', () => {
    let fleetAgentIds: string[];
    let endpointMetadataDoc: HostMetadata;

    beforeEach(() => {
      fleetAgentIds = ['one', 'two'];
      endpointMetadataDoc = endpointDocGenerator.generateHostMetadata();
      esClient.search.mockReturnValue(
        elasticsearchServiceMock.createSuccessTransportRequestPromise(
          legacyMetadataSearchResponseMock(endpointMetadataDoc)
        )
      );
    });

    it('should call elasticsearch with proper filter', async () => {
      await metadataService.findHostMetadataForFleetAgents(esClient, fleetAgentIds);
      expect(esClient.search).toHaveBeenCalledWith(
        { ...getESQueryHostMetadataByFleetAgentIds(fleetAgentIds), size: fleetAgentIds.length },
        { ignore: [404] }
      );
    });

    it('should throw a wrapped elasticsearch Error when one occurs', async () => {
      esClient.search.mockRejectedValue(new Error('foo bar'));
      await expect(
        metadataService.findHostMetadataForFleetAgents(esClient, fleetAgentIds)
      ).rejects.toThrow(EndpointError);
    });

    it('should return an array of Host Metadata documents', async () => {
      const response = await metadataService.findHostMetadataForFleetAgents(
        esClient,
        fleetAgentIds
      );
      expect(response).toEqual([endpointMetadataDoc]);
    });
  });

  describe('#doesUnitedIndexExist', () => {
    it('should return true if united index found', async () => {
      const esMockResponse = elasticsearchServiceMock.createSuccessTransportRequestPromise(
        unitedMetadataSearchResponseMock()
      );
      esClient.search.mockResolvedValue(esMockResponse);
      const doesIndexExist = await metadataService.doesUnitedIndexExist(esClient);

      expect(doesIndexExist).toEqual(true);
    });

    it('should return false if united index not found', async () => {
      const esMockResponse = elasticsearchServiceMock.createErrorTransportRequestPromise({
        meta: { body: { error: { type: 'index_not_found_exception' } } },
      });
      esClient.search.mockResolvedValue(esMockResponse);
      const doesIndexExist = await metadataService.doesUnitedIndexExist(esClient);

      expect(doesIndexExist).toEqual(false);
    });

    it('should throw wrapped error if es error other than index not found', async () => {
      const esMockResponse = elasticsearchServiceMock.createErrorTransportRequestPromise({});
      esClient.search.mockResolvedValue(esMockResponse);
      const response = metadataService.doesUnitedIndexExist(esClient);
      await expect(response).rejects.toThrow(EndpointError);
    });
  });

  describe('#getHostMetadataList', () => {
    let agentPolicyServiceMock: jest.Mocked<AgentPolicyServiceInterface>;

    beforeEach(() => {
      agentPolicyServiceMock = testMockedContext.agentPolicyService;
      esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    });

    it('should throw wrapped error if es error', async () => {
      const esMockResponse = elasticsearchServiceMock.createErrorTransportRequestPromise({});
      esClient.search.mockResolvedValue(esMockResponse);
      const metadataListResponse = metadataService.getHostMetadataList(esClient, {
        page: 0,
        pageSize: 10,
        kuery: '',
        hostStatuses: [],
      });
      await expect(metadataListResponse).rejects.toThrow(EndpointError);
    });

    it('should correctly list HostMetadata', async () => {
      const policyId = 'test-agent-policy-id';
      const packagePolicies = [
        Object.assign(endpointDocGenerator.generatePolicyPackagePolicy(), {
          id: 'test-package-policy-id',
          policy_id: policyId,
          revision: 1,
        }),
      ];
      const packagePolicyIds = packagePolicies.map((policy) => policy.policy_id);
      const agentPolicies = [
        Object.assign(endpointDocGenerator.generateAgentPolicy(), {
          id: policyId,
          revision: 2,
          package_policies: packagePolicies,
        }),
      ];
      const agentPolicyIds = agentPolicies.map((policy) => policy.id);
      const endpointMetadataDoc = endpointDocGenerator.generateHostMetadata();
      const mockAgent = {
        policy_id: agentPolicies[0].id,
        policy_revision: agentPolicies[0].revision,
      } as unknown as Agent;
      const mockDoc = unitedMetadataSearchResponseMock(endpointMetadataDoc, mockAgent);
      const esMockResponse = await elasticsearchServiceMock.createSuccessTransportRequestPromise(
        mockDoc
      );

      esClient.search.mockResolvedValue(esMockResponse);
      agentPolicyServiceMock.getByIds.mockResolvedValue(agentPolicies);
      testMockedContext.packagePolicyService.list.mockImplementation(
        async (_, { page, perPage }) => {
          const response = {
            items: packagePolicies,
            page: page ?? 1,
            total: packagePolicies.length,
            perPage: packagePolicies.length,
          };

          if ((page ?? 1) > 1) {
            response.items = [];
          }

          return response;
        }
      );

      const queryOptions = { page: 1, pageSize: 10, kuery: '', hostStatuses: [] };
      const metadataListResponse = await metadataService.getHostMetadataList(
        esClient,
        queryOptions
      );
      const unitedIndexQuery = await buildUnitedIndexQuery(queryOptions, packagePolicyIds);

      expect(esClient.search).toBeCalledWith(unitedIndexQuery);
      expect(agentPolicyServiceMock.getByIds).toBeCalledWith(expect.anything(), agentPolicyIds);
      expect(metadataListResponse).toEqual({
        data: [
          {
            metadata: endpointMetadataDoc,
            host_status: 'inactive',
            policy_info: {
              agent: {
                applied: {
                  id: mockAgent.policy_id,
                  revision: mockAgent.policy_revision,
                },
                configured: {
                  id: agentPolicies[0].id,
                  revision: agentPolicies[0].revision,
                },
              },
              endpoint: {
                id: packagePolicies[0].id,
                revision: packagePolicies[0].revision,
              },
            },
          },
        ],
        total: 1,
      });
    });
  });
});
