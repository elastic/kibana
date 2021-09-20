/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsServiceMock } from '../../../../../src/core/server/mocks';
import { IScopedClusterClient, SavedObjectsClientContract } from '../../../../../src/core/server';
import { listMock } from '../../../lists/server/mocks';
import { securityMock } from '../../../security/server/mocks';
import { alertsMock } from '../../../alerting/server/mocks';
import { xpackMocks } from '../fixtures';
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
import { LicenseService } from '../../common/license';
import { SecuritySolutionRequestHandlerContext } from '../types';
import { parseExperimentalConfigValue } from '../../common/experimental_features';
// A TS error (TS2403) is thrown when attempting to export the mock function below from Cases
// plugin server `index.ts`. Its unclear what is actually causing the error. Since this is a Mock
// file and not bundled with the application, adding a eslint disable below and using import from
// a restricted path.
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { createCasesClientMock } from '../../../cases/server/client/mocks';
import { EndpointMetadataService } from './services/metadata';

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
  return {
    start: jest.fn(),
    stop: jest.fn(),
    getExperimentalFeatures: jest.fn(),
    getAgentService: jest.fn(),
    getAgentPolicyService: jest.fn(),
    getManifestManager: jest.fn().mockReturnValue(mockManifestManager ?? jest.fn()),
  } as unknown as jest.Mocked<EndpointAppContextService>;
};

/**
 * Creates a mocked input contract for the `EndpointAppContextService#start()` method
 */
export const createMockEndpointAppContextServiceStartContract =
  (): jest.Mocked<EndpointAppContextServiceStartContract> => {
    const factory = new AppClientFactory();
    const config = createMockConfig();
    const casesClientMock = createCasesClientMock();
    const savedObjectsStart = savedObjectsServiceMock.createStartContract();
    const agentService = createMockAgentService();
    const agentPolicyService = createMockAgentPolicyService();
    const endpointMetadataService = new EndpointMetadataService(
      savedObjectsStart,
      agentService,
      agentPolicyService
    );

    factory.setup({ getSpaceId: () => 'mockSpace', config });

    return {
      agentService,
      agentPolicyService,
      endpointMetadataService,
      packageService: createMockPackageService(),
      logger: loggingSystemMock.create().get('mock_endpoint_app_context'),
      manifestManager: getManifestManagerMock(),
      appClientFactory: factory,
      security: securityMock.createStart(),
      alerting: alertsMock.createStart(),
      config,
      licenseService: new LicenseService(),
      registerIngestCallback: jest.fn<
        ReturnType<FleetStartContract['registerExternalCallback']>,
        Parameters<FleetStartContract['registerExternalCallback']>
      >(),
      exceptionListsClient: listMock.getExceptionListClient(),
      packagePolicyService: createPackagePolicyServiceMock(),
      cases: {
        getCasesClientWithRequest: jest.fn(async () => casesClientMock),
      },
    };
  };

/**
 * Create mock PackageService
 */

export const createMockPackageService = (): jest.Mocked<PackageService> => {
  return {
    getInstallation: jest.fn(),
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
    requestHandlerContext:
      xpackMocks.createRequestHandlerContext() as unknown as jest.Mocked<SecuritySolutionRequestHandlerContext>,
  };
};

export function createRouteHandlerContext(
  dataClient: jest.Mocked<IScopedClusterClient>,
  savedObjectsClient: jest.Mocked<SavedObjectsClientContract>
) {
  const context =
    xpackMocks.createRequestHandlerContext() as unknown as jest.Mocked<SecuritySolutionRequestHandlerContext>;
  context.core.elasticsearch.client = dataClient;
  context.core.savedObjects.client = savedObjectsClient;
  return context;
}
