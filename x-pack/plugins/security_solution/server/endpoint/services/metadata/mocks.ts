/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceStart } from '@kbn/core/server';
import { coreMock, type ElasticsearchClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { createPackagePolicyServiceMock } from '@kbn/fleet-plugin/server/mocks';
import type { AgentPolicyServiceInterface, AgentService } from '@kbn/fleet-plugin/server';
import type { Agent, GetAgentPoliciesResponseItem } from '@kbn/fleet-plugin/common';
import type {
  PolicyData,
  UnitedAgentMetadataPersistedData,
} from '../../../../common/endpoint/types';
import { FleetAgentPolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_agent_policy_generator';
import { FleetAgentGenerator } from '../../../../common/endpoint/data_generators/fleet_agent_generator';
import { FleetPackagePolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { applyEsClientSearchMock } from '../../mocks/utils.mock';
import type { EndpointInternalFleetServicesInterfaceMocked } from '../fleet/endpoint_fleet_services_factory.mocks';
import { createEndpointFleetServicesFactoryMock } from '../fleet/endpoint_fleet_services_factory.mocks';
import { createMockEndpointAppContextServiceStartContract } from '../../mocks';
import { EndpointMetadataService } from './endpoint_metadata_service';
import { SavedObjectsClientFactory } from '../saved_objects';
import {
  METADATA_UNITED_INDEX,
  metadataCurrentIndexPattern,
} from '../../../../common/endpoint/constants';
import { EndpointMetadataGenerator } from '../../../../common/endpoint/data_generators/endpoint_metadata_generator';

/**
 * Endpoint Metadata Service test context. Includes an instance of `EndpointMetadataService` along with the
 * dependencies that were used to initialize that instance.
 */
export interface EndpointMetadataServiceTestContextMock {
  savedObjectsStart: jest.Mocked<SavedObjectsServiceStart>;
  agentService: jest.Mocked<AgentService>;
  agentPolicyService: jest.Mocked<AgentPolicyServiceInterface>;
  packagePolicyService: ReturnType<typeof createPackagePolicyServiceMock>;
  endpointMetadataService: EndpointMetadataService;
  fleetServices: EndpointInternalFleetServicesInterfaceMocked;
  logger: ReturnType<ReturnType<typeof loggingSystemMock.create>['get']>;
  esClient: ElasticsearchClientMock;
  applyMetadataMocks: typeof applyMetadataMocks;
}

export const createEndpointMetadataServiceTestContextMock =
  (): EndpointMetadataServiceTestContextMock => {
    const logger = loggingSystemMock.create().get();
    const { esClient, fleetStartServices, savedObjectsServiceStart } =
      createMockEndpointAppContextServiceStartContract();
    const savedObjectsServiceFactory = new SavedObjectsClientFactory(
      savedObjectsServiceStart,
      coreMock.createSetup().http
    );
    const fleetServices = createEndpointFleetServicesFactoryMock({
      fleetDependencies: fleetStartServices,
      savedObjects: savedObjectsServiceFactory,
    }).service.asInternalUser();
    const endpointMetadataService = new EndpointMetadataService(
      esClient,
      savedObjectsServiceFactory.createInternalScopedSoClient({ readonly: false }),
      fleetServices,
      logger
    );

    fleetServices.packagePolicy.list.mockImplementation(async (_, options) => {
      return {
        items: [],
        total: 0,
        page: options.page ?? 1,
        perPage: options.perPage ?? 10,
      };
    });

    return {
      savedObjectsStart: savedObjectsServiceStart,
      agentService: {
        asInternalUser: fleetServices.agent,
        asScoped: jest.fn().mockReturnValue(fleetServices.agent),
        asInternalScopedUser: jest.fn().mockReturnValue(fleetServices.agent),
      },
      agentPolicyService: fleetServices.agentPolicy,
      packagePolicyService: fleetServices.packagePolicy,
      logger,
      endpointMetadataService,
      fleetServices,
      applyMetadataMocks,
      esClient: esClient as ElasticsearchClientMock,
    };
  };

export interface ApplyMetadataMocksResponse {
  unitedMetadata: UnitedAgentMetadataPersistedData;
  integrationPolicies: PolicyData[];
  agentPolicies: GetAgentPoliciesResponseItem[];
  agents: Agent[];
}

/**
 * Apply mocks to the various services used to retrieve metadata via the EndpointMetadataService.
 * Returns the data that is used in the mocks, thus allowing manipulation of it before running the
 * test.
 * @param esClientMock
 * @param fleetServices
 */
export const applyMetadataMocks = (
  esClientMock: ElasticsearchClientMock,
  fleetServices: EndpointInternalFleetServicesInterfaceMocked
): ApplyMetadataMocksResponse => {
  const metadataGenerator = new EndpointMetadataGenerator('seed');
  const fleetIntegrationPolicyGenerator = new FleetPackagePolicyGenerator('seed');
  const fleetAgentGenerator = new FleetAgentGenerator('seed');
  const fleetAgentPolicyGenerator = new FleetAgentPolicyGenerator('seed');

  const unitedMetadata = metadataGenerator.generateUnitedAgentMetadata();
  const integrationPolicies = [
    fleetIntegrationPolicyGenerator.generateEndpointPackagePolicy({
      id: unitedMetadata.united.endpoint.Endpoint.policy.applied.id,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      policy_ids: [unitedMetadata.united.agent.policy_id!],
    }),
  ];
  const agentPolicies = [
    fleetAgentPolicyGenerator.generate({ id: unitedMetadata.united.agent.policy_id }),
  ];
  const agents = [
    fleetAgentGenerator.generate({
      id: unitedMetadata.agent.id,
      policy_id: agentPolicies[0].id,
    }),
  ];

  applyEsClientSearchMock({
    esClientMock,
    index: METADATA_UNITED_INDEX,
    response: metadataGenerator.toEsSearchResponse([
      metadataGenerator.toEsSearchHit(unitedMetadata, METADATA_UNITED_INDEX),
    ]),
  });

  applyEsClientSearchMock({
    esClientMock,
    index: metadataCurrentIndexPattern,
    response: metadataGenerator.toEsSearchResponse([
      metadataGenerator.toEsSearchHit(unitedMetadata.united.endpoint, metadataCurrentIndexPattern),
    ]),
  });

  fleetServices.packagePolicy.list.mockImplementation(async (_, { page = 1 }) => {
    // FYI: need to implement returning an empty list of items after page 1 due to how
    //      `getAllEndpointPackagePolicies()` is currently looping through all policies
    //      See `x-pack/plugins/security_solution/server/endpoint/routes/metadata/support/endpoint_package_policies.ts`
    return {
      items: page === 1 ? integrationPolicies : [],
      page: 1,
      total: 1,
      perPage: 20,
    };
  });

  fleetServices.packagePolicy.get.mockImplementation(async () => {
    return integrationPolicies[0];
  });

  fleetServices.agentPolicy.getByIds.mockImplementation(async () => {
    return agentPolicies;
  });

  fleetServices.agentPolicy.get.mockImplementation(async () => {
    return agentPolicies[0];
  });

  fleetServices.agent.getByIds.mockImplementation(async () => {
    return agents;
  });

  fleetServices.agent.getAgent.mockImplementation(async () => {
    return agents[0];
  });

  return {
    unitedMetadata,
    integrationPolicies,
    agentPolicies,
    agents,
  };
};
