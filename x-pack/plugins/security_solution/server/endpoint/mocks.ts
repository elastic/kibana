/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILegacyScopedClusterClient, SavedObjectsClientContract } from 'kibana/server';
import { loggingSystemMock, savedObjectsServiceMock } from 'src/core/server/mocks';
import { listMock } from '../../../lists/server/mocks';
import { securityMock } from '../../../security/server/mocks';
import { alertsMock } from '../../../alerting/server/mocks';
import { xpackMocks } from '../../../../mocks';
import { FleetStartContract, ExternalCallback, PackageService } from '../../../fleet/server';
import {
  createPackagePolicyServiceMock,
  createMockAgentPolicyService,
  createMockAgentService,
  createArtifactsClientMock,
} from '../../../fleet/server/mocks';
import { AppClientFactory } from '../client';
import { createMockConfig } from '../lib/detection_engine/routes/__mocks__';
import {
  EndpointAppContextService,
  EndpointAppContextServiceStartContract,
} from './endpoint_app_context_services';
import { ManifestManager } from './services/artifacts/manifest_manager/manifest_manager';
import { getManifestManagerMock } from './services/artifacts/manifest_manager/manifest_manager.mock';
import { EndpointAppContext } from './types';
import { MetadataRequestContext } from './routes/metadata/handlers';
// import { licenseMock } from '../../../licensing/common/licensing.mock';
import { LicenseService } from '../../common/license/license';
import { SecuritySolutionRequestHandlerContext } from '../types';
import { parseExperimentalConfigValue } from '../../common/experimental_features';

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
    experimentalFeatures: parseExperimentalConfigValue(createMockConfig().enableExperimental),
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
    getExperimentalFeatures: jest.fn(),
    getAgentService: jest.fn(),
    getAgentPolicyService: jest.fn(),
    getManifestManager: jest.fn().mockReturnValue(mockManifestManager ?? jest.fn()),
    getScopedSavedObjectsClient: jest.fn(),
  } as unknown) as jest.Mocked<EndpointAppContextService>;
};

/**
 * Creates a mocked input contract for the `EndpointAppContextService#start()` method
 */
export const createMockEndpointAppContextServiceStartContract = (): jest.Mocked<EndpointAppContextServiceStartContract> => {
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
    alerting: alertsMock.createStart(),
    config,
    licenseService: new LicenseService(),
    registerIngestCallback: jest.fn<
      ReturnType<FleetStartContract['registerExternalCallback']>,
      Parameters<FleetStartContract['registerExternalCallback']>
    >(),
    exceptionListsClient: listMock.getExceptionListClient(),
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
 * Creates a mock IndexPatternService for use in tests that need to interact with the Fleet's
 * ESIndexPatternService.
 *
 * @param indexPattern a string index pattern to return when called by a test
 * @returns the same value as `indexPattern` parameter
 */
export const createMockFleetStartContract = (indexPattern: string): FleetStartContract => {
  return {
    fleetSetupCompleted: jest.fn().mockResolvedValue(undefined),
    esIndexPatternService: {
      getESIndexPattern: jest.fn().mockResolvedValue(indexPattern),
    },
    agentService: createMockAgentService(),
    packageService: createMockPackageService(),
    agentPolicyService: createMockAgentPolicyService(),
    registerExternalCallback: jest.fn((...args: ExternalCallback) => {}),
    packagePolicyService: createPackagePolicyServiceMock(),
    createArtifactsClient: jest.fn().mockReturnValue(createArtifactsClientMock()),
  };
};

export const createMockMetadataRequestContext = (): jest.Mocked<MetadataRequestContext> => {
  return {
    endpointAppContextService: createMockEndpointAppContextService(),
    logger: loggingSystemMock.create().get('mock_endpoint_app_context'),
    requestHandlerContext: (xpackMocks.createRequestHandlerContext() as unknown) as jest.Mocked<SecuritySolutionRequestHandlerContext>,
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
