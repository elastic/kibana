/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsServiceStart } from 'kibana/server';
import { EndpointMetadataService } from './endpoint_metadata_service';
import { savedObjectsServiceMock } from '../../../../../../../src/core/server/mocks';
import {
  createMockAgentPolicyService,
  createMockAgentService,
  createMockPackageService,
  createPackagePolicyServiceMock,
} from '../../../../../fleet/server/mocks';
import { AgentPolicyServiceInterface, AgentService } from '../../../../../fleet/server';
import {
  EndpointFleetServicesFactory,
  EndpointFleetServicesInterface,
} from '../endpoint_fleet_services';

const createCustomizedPackagePolicyService = () => {
  const service = createPackagePolicyServiceMock();
  service.list.mockImplementation(async (_, options) => {
    return {
      items: [],
      total: 0,
      page: options.page ?? 1,
      perPage: options.perPage ?? 10,
    };
  });
  return service;
};

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
  fleetServices: EndpointFleetServicesInterface;
}

export const createEndpointMetadataServiceTestContextMock = (
  savedObjectsStart: jest.Mocked<SavedObjectsServiceStart> = savedObjectsServiceMock.createStartContract(),
  agentService: jest.Mocked<AgentService> = createMockAgentService(),
  agentPolicyService: jest.Mocked<AgentPolicyServiceInterface> = createMockAgentPolicyService(),
  packagePolicyService: ReturnType<
    typeof createPackagePolicyServiceMock
  > = createCustomizedPackagePolicyService(),
  packageService: ReturnType<typeof createMockPackageService> = createMockPackageService()
): EndpointMetadataServiceTestContextMock => {
  const fleetServices = new EndpointFleetServicesFactory({
    agentService,
    packageService,
    packagePolicyService,
    agentPolicyService,
  }).asInternalUser();

  const endpointMetadataService = new EndpointMetadataService(
    savedObjectsStart,
    agentPolicyService,
    packagePolicyService
  );

  return {
    savedObjectsStart,
    agentService,
    agentPolicyService,
    packagePolicyService,
    endpointMetadataService,
    fleetServices,
  };
};
