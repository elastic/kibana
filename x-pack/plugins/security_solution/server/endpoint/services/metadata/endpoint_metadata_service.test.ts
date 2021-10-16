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
import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
} from '../../../../../../../src/core/server/mocks';
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
import { KibanaRequest } from '../../../../../../../src/core/server';
import { EndpointAppContext } from '../../types';
import { Agent, AgentPolicy, PackagePolicy } from '../../../../../fleet/common';
import { AgentPolicyServiceInterface } from '../../../../../fleet/server/services';

describe('EndpointMetadataService', () => {
  let testMockedContext: EndpointMetadataServiceTestContextMock;
  let metadataService: EndpointMetadataServiceTestContextMock['endpointMetadataService'];
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    testMockedContext = createEndpointMetadataServiceTestContextMock();
    metadataService = testMockedContext.endpointMetadataService;
    esClient = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
  });

  describe('#findHostMetadataForFleetAgents()', () => {
    let fleetAgentIds: string[];
    let endpointMetadataDoc: HostMetadata;

    beforeEach(() => {
      fleetAgentIds = ['one', 'two'];
      endpointMetadataDoc = new EndpointDocGenerator().generateHostMetadata();
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
    let soClient: ReturnType<typeof savedObjectsClientMock.create>;
    let mockRequest: KibanaRequest;
    let endpointAppContextMock: EndpointAppContext;
    let agentPolicyServiceMock: jest.Mocked<AgentPolicyServiceInterface>;

    beforeEach(() => {
      soClient = savedObjectsClientMock.create();
      mockRequest = httpServerMock.createKibanaRequest({
        body: {
          paging_properties: [
            {
              page_size: 10,
            },
            {
              page_index: 0,
            },
          ],
        },
      });

      endpointAppContextMock = { config: () => ({}) } as EndpointAppContext;
      agentPolicyServiceMock = testMockedContext.agentPolicyService;
      esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    });

    it('should throw wrapped error if es error', async () => {
      const esMockResponse = elasticsearchServiceMock.createErrorTransportRequestPromise({});
      esClient.search.mockResolvedValue(esMockResponse);
      const metadataListResponse = metadataService.getHostMetadataList(
        esClient,
        soClient,
        mockRequest,
        endpointAppContextMock,
        []
      );
      await expect(metadataListResponse).rejects.toThrow(EndpointError);
    });

    it('should correctly list HostMetadata', async () => {
      const policyId = 'test-agent-policy-id';
      const packagePolicies = [
        {
          id: 'test-package-policy-id',
          policy_id: policyId,
          revision: 1,
        } as PackagePolicy,
      ];
      const packagePolicyIds = packagePolicies.map((policy) => policy.policy_id);
      const agentPolicies = [
        {
          id: policyId,
          revision: 2,
        } as AgentPolicy,
      ];
      const agentPolicyIds = agentPolicies.map((policy) => policy.id);
      const endpointMetadataDoc = new EndpointDocGenerator().generateHostMetadata();
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

      const metadataListResponse = await metadataService.getHostMetadataList(
        esClient,
        soClient,
        mockRequest,
        endpointAppContextMock,
        packagePolicies
      );
      const unitedIndexQuery = await buildUnitedIndexQuery(
        mockRequest,
        endpointAppContextMock,
        packagePolicyIds
      );

      expect(esClient.search).toBeCalledWith(unitedIndexQuery);
      expect(agentPolicyServiceMock.getByIds).toBeCalledWith(soClient, agentPolicyIds);
      expect(metadataListResponse).toEqual({
        request_page_size: 10,
        request_page_index: 0,
        total: 1,
        hosts: [
          {
            metadata: endpointMetadataDoc,
            host_status: 'unhealthy',
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
      });
    });
  });
});
