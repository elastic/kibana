/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient, SavedObjectsClientContract } from 'kibana/server';
import { loggingSystemMock, savedObjectsServiceMock } from 'src/core/server/mocks';
import { securityMock } from '../../../security/server/mocks';
import { alertsMock } from '../../../alerts/server/mocks';
import { xpackMocks } from '../../../../mocks';
import {
  AgentService,
  IngestManagerStartContract,
  ExternalCallback,
  PackageService,
  AgentPolicyServiceInterface,
} from '../../../ingest_manager/server';
import { createPackagePolicyServiceMock } from '../../../ingest_manager/server/mocks';
import { AppClientFactory } from '../client';
import { createMockConfig } from '../lib/detection_engine/routes/__mocks__';
import {
  EndpointAppContextService,
  EndpointAppContextServiceStartContract,
} from './endpoint_app_context_services';
import { ManifestManager } from './services/artifacts/manifest_manager/manifest_manager';
import { getManifestManagerMock } from './services/artifacts/manifest_manager/manifest_manager.mock';
import { EndpointAppContext } from './types';

/**
 * Creates a mocked EndpointAppContext.
 */
export const createMockEndpointAppContext = (
  mockManifestManager?: ManifestManager
): EndpointAppContext => {
  return {
    logFactory: loggingSystemMock.create(),
    config: () => Promise.resolve(createMockConfig()),
    service: createMockEndpointAppContextService(mockManifestManager),
  };
};

/**
 * Creates a mocked EndpointAppContextService
 */
export const createMockEndpointAppContextService = (
  mockManifestManager?: ManifestManager
): jest.Mocked<EndpointAppContextService> => {
  return ({
    start: jest.fn(),
    stop: jest.fn(),
    getAgentService: jest.fn(),
    getManifestManager: jest.fn().mockReturnValue(mockManifestManager ?? jest.fn()),
    getScopedSavedObjectsClient: jest.fn(),
  } as unknown) as jest.Mocked<EndpointAppContextService>;
};

/**
 * Creates a mocked input contract for the `EndpointAppContextService#start()` method
 */
export const createMockEndpointAppContextServiceStartContract = (): jest.Mocked<
  EndpointAppContextServiceStartContract
> => {
  const factory = new AppClientFactory();
  const config = createMockConfig();
  factory.setup({ getSpaceId: () => 'mockSpace', config });
  return {
    agentService: createMockAgentService(),
    packageService: createMockPackageService(),
    logger: loggingSystemMock.create().get('mock_endpoint_app_context'),
    savedObjectsStart: savedObjectsServiceMock.createStartContract(),
    manifestManager: getManifestManagerMock(),
    appClientFactory: factory,
    security: securityMock.createSetup(),
    alerts: alertsMock.createStart(),
    config,
    registerIngestCallback: jest.fn<
      ReturnType<IngestManagerStartContract['registerExternalCallback']>,
      Parameters<IngestManagerStartContract['registerExternalCallback']>
    >(),
  };
};

/**
 * Create mock PackageService
 */

export const createMockPackageService = (): jest.Mocked<PackageService> => {
  return {
    getInstalledEsAssetReferences: jest.fn(),
  };
};

/**
 * Creates a mock AgentService
 */
export const createMockAgentService = (): jest.Mocked<AgentService> => {
  return {
    getAgentStatusById: jest.fn(),
    authenticateAgentWithAccessToken: jest.fn(),
    getAgent: jest.fn(),
    listAgents: jest.fn(),
  };
};

/**
 * Create a mock AgentPolicyService
 */

export const createMockAgentPolicyService = (): jest.Mocked<AgentPolicyServiceInterface> => {
  return {
    list: jest.fn(),
    ensureDefaultAgentPolicy: jest.fn(),
    create: jest.fn(),
    requireUniqueName: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    copy: jest.fn(),
    bumpRevision: jest.fn(),
    assignPackagePolicies: jest.fn(),
    unassignPackagePolicies: jest.fn(),
    getDefaultAgentPolicyId: jest.fn(),
    delete: jest.fn(),
    createFleetPolicyChangeAction: jest.fn(),
    getFullAgentPolicy: jest.fn(),
    bumpAllAgentPolicies: jest.fn(),
  };
};

/**
 * Creates a mock IndexPatternService for use in tests that need to interact with the Ingest Manager's
 * ESIndexPatternService.
 *
 * @param indexPattern a string index pattern to return when called by a test
 * @returns the same value as `indexPattern` parameter
 */
export const createMockIngestManagerStartContract = (
  indexPattern: string
): IngestManagerStartContract => {
  return {
    esIndexPatternService: {
      getESIndexPattern: jest.fn().mockResolvedValue(indexPattern),
    },
    agentPolicyService: createMockAgentPolicyService(),
    agentService: createMockAgentService(),
    packageService: createMockPackageService(),
    registerExternalCallback: jest.fn((...args: ExternalCallback) => {}),
    packagePolicyService: createPackagePolicyServiceMock(),
  };
};

export function createRouteHandlerContext(
  dataClient: jest.Mocked<ILegacyScopedClusterClient>,
  savedObjectsClient: jest.Mocked<SavedObjectsClientContract>
) {
  const context = xpackMocks.createRequestHandlerContext();
  context.core.elasticsearch.legacy.client = dataClient;
  context.core.savedObjects.client = savedObjectsClient;
  return context;
}
