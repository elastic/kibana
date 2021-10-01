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
} from '../../../../../fleet/server/mocks';
import { AgentPolicyServiceInterface, AgentService } from '../../../../../fleet/server';

/**
 * Endpoint Metadata Service test context. Includes an instance of `EndpointMetadataService` along with the
 * dependencies that were used to initialize that instance.
 */
export interface EndpointMetadataServiceTestContextMock {
  savedObjectsStart: jest.Mocked<SavedObjectsServiceStart>;
  agentService: jest.Mocked<AgentService>;
  agentPolicyService: jest.Mocked<AgentPolicyServiceInterface>;
  endpointMetadataService: EndpointMetadataService;
}

export const createEndpointMetadataServiceTestContextMock = (
  savedObjectsStart: jest.Mocked<SavedObjectsServiceStart> = savedObjectsServiceMock.createStartContract(),
  agentService: jest.Mocked<AgentService> = createMockAgentService(),
  agentPolicyService: jest.Mocked<AgentPolicyServiceInterface> = createMockAgentPolicyService()
): EndpointMetadataServiceTestContextMock => {
  const endpointMetadataService = new EndpointMetadataService(
    savedObjectsStart,
    agentService,
    agentPolicyService
  );

  return {
    savedObjectsStart,
    agentService,
    agentPolicyService,
    endpointMetadataService,
  };
};
