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
import { FleetStartContract, ExternalCallback } from '../../../fleet/server';
import {
  createPackagePolicyServiceMock,
  createMockAgentPolicyService,
  createMockAgentService,
  createArtifactsClientMock,
  createMockPackageService,
} from '../../../fleet/server/mocks';
import { createMockConfig, requestContextMock } from '../lib/detection_engine/routes/__mocks__';
import {
  EndpointAppContextService,
  EndpointAppContextServiceSetupContract,
  EndpointAppContextServiceStartContract,
} from './endpoint_app_context_services';
import { ManifestManager } from './services/artifacts/manifest_manager/manifest_manager';
import { getManifestManagerMock } from './services/artifacts/manifest_manager/manifest_manager.mock';
import { EndpointAppContext } from './types';
import { MetadataRequestContext } from './routes/metadata/handlers';
import { SecuritySolutionRequestHandlerContext } from '../types';
import { parseExperimentalConfigValue } from '../../common/experimental_features';
// A TS error (TS2403) is thrown when attempting to export the mock function below from Cases
// plugin server `index.ts`. Its unclear what is actually causing the error. Since this is a Mock
// file and not bundled with the application, adding a eslint disable below and using import from
// a restricted path.
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { createCasesClientMock } from '../../../cases/server/client/mocks';
import { requestContextFactoryMock } from '../request_context_factory.mock';
import { EndpointMetadataService } from './services/metadata';
import { createFleetAuthzMock } from '../../../fleet/common';
import { createMockClients } from '../lib/detection_engine/routes/__mocks__/request_context';
import { createEndpointMetadataServiceTestContextMock } from './services/metadata/mocks';

import type { EndpointAuthz } from '../../common/endpoint/types/authz';
import { EndpointFleetServicesFactory } from './services/fleet';
import { createLicenseServiceMock } from '../../common/license/mocks';
import { createFeatureUsageServiceMock } from './services/feature_usage';

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
  const mockEndpointMetadataContext = createEndpointMetadataServiceTestContextMock();
  return {
    start: jest.fn(),
    stop: jest.fn(),
    getExperimentalFeatures: jest.fn(),
    getAgentService: jest.fn(),
    getAgentPolicyService: jest.fn(),
    getManifestManager: jest.fn().mockReturnValue(mockManifestManager ?? jest.fn()),
    getEndpointMetadataService: jest.fn(() => mockEndpointMetadataContext.endpointMetadataService),
    getInternalFleetServices: jest.fn(() => mockEndpointMetadataContext.fleetServices),
  } as unknown as jest.Mocked<EndpointAppContextService>;
};

/**
 * Creates a mocked input contract for the `EndpointAppContextService#setup()` method
 */
export const createMockEndpointAppContextServiceSetupContract =
  (): jest.Mocked<EndpointAppContextServiceSetupContract> => {
    return {
      securitySolutionRequestContextFactory: requestContextFactoryMock.create(),
    };
  };

/**
 * Creates a mocked input contract for the `EndpointAppContextService#start()` method
 */
export const createMockEndpointAppContextServiceStartContract =
  (): jest.Mocked<EndpointAppContextServiceStartContract> => {
    const config = createMockConfig();

    const logger = loggingSystemMock.create().get('mock_endpoint_app_context');
    const casesClientMock = createCasesClientMock();
    const savedObjectsStart = savedObjectsServiceMock.createStartContract();
    const security = securityMock.createStart();
    const agentService = createMockAgentService();
    const agentPolicyService = createMockAgentPolicyService();
    const packagePolicyService = createPackagePolicyServiceMock();
    const packageService = createMockPackageService();
    const endpointMetadataService = new EndpointMetadataService(
      savedObjectsStart,
      agentPolicyService,
      packagePolicyService,
      logger
    );
    const endpointFleetServicesFactory = new EndpointFleetServicesFactory(
      {
        packageService,
        packagePolicyService,
        agentPolicyService,
        agentService,
      },
      savedObjectsStart
    );

    packagePolicyService.list.mockImplementation(async (_, options) => {
      return {
        items: [],
        total: 0,
        page: options.page ?? 1,
        perPage: options.perPage ?? 10,
      };
    });

    // Make current user have `superuser` role by default
    security.authc.getCurrentUser.mockReturnValue(
      securityMock.createMockAuthenticatedUser({ roles: ['superuser'] })
    );

    return {
      agentService,
      agentPolicyService,
      endpointMetadataService,
      endpointFleetServicesFactory,
      packagePolicyService,
      logger,
      packageService,
      fleetAuthzService: createFleetAuthzServiceMock(),
      manifestManager: getManifestManagerMock(),
      security,
      alerting: alertsMock.createStart(),
      config,
      licenseService: createLicenseServiceMock(),
      registerIngestCallback: jest.fn<
        ReturnType<FleetStartContract['registerExternalCallback']>,
        Parameters<FleetStartContract['registerExternalCallback']>
      >(),
      exceptionListsClient: listMock.getExceptionListClient(),
      cases: {
        getCasesClientWithRequest: jest.fn(async () => casesClientMock),
      },
      featureUsageService: createFeatureUsageServiceMock(),
    };
  };

export const createFleetAuthzServiceMock = (): jest.Mocked<FleetStartContract['authz']> => {
  return {
    fromRequest: jest.fn(async (_) => createFleetAuthzMock()),
  };
};

/**
 * Creates the Fleet Start contract mock return by the Fleet Plugin
 *
 * @param indexPattern a string index pattern to return when called by a test
 * @returns the same value as `indexPattern` parameter
 */
export const createMockFleetStartContract = (indexPattern: string): FleetStartContract => {
  return {
    authz: createFleetAuthzServiceMock(),
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
  savedObjectsClient: jest.Mocked<SavedObjectsClientContract>,
  overrides: { endpointAuthz?: Partial<EndpointAuthz> } = {}
) {
  const context = requestContextMock.create(createMockClients(), overrides);
  context.core.elasticsearch.client = dataClient;
  context.core.savedObjects.client = savedObjectsClient;
  return context;
}
