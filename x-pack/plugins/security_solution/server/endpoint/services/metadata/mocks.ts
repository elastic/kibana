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
import { createEndpointFleetServicesFactoryMock } from '../fleet/endpoint_fleet_services_factory.mocks';
import { createMockEndpointAppContextServiceStartContract } from '../../mocks';
import { EndpointMetadataService } from './endpoint_metadata_service';
import type { EndpointInternalFleetServicesInterface } from '../fleet/endpoint_fleet_services_factory';
import { SavedObjectsClientFactory } from '../saved_objects';

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
  fleetServices: EndpointInternalFleetServicesInterface;
  logger: ReturnType<ReturnType<typeof loggingSystemMock.create>['get']>;
  esClient: ElasticsearchClientMock;
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
      },
      agentPolicyService: fleetServices.agentPolicy,
      packagePolicyService: fleetServices.packagePolicy,
      logger,
      endpointMetadataService,
      fleetServices,
      esClient: esClient as ElasticsearchClientMock,
    };
  };
