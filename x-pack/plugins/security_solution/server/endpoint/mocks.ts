/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { AwaitedProperties } from '@kbn/utility-types';
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import type {
  KibanaRequest,
  RouteConfig,
  SavedObjectsClientContract,
  RequestHandler,
  IRouter,
} from '@kbn/core/server';
import { listMock } from '@kbn/lists-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import {
  createPackagePolicyServiceMock,
  createMockAgentPolicyService,
  createMockAgentService,
  createMockPackageService,
  createMessageSigningServiceMock,
  createFleetFilesClientMock,
} from '@kbn/fleet-plugin/server/mocks';
import { createFleetAuthzMock } from '@kbn/fleet-plugin/common/mocks';
import type { RequestFixtureOptions } from '@kbn/core-http-router-server-mocks';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { casesPluginMock } from '@kbn/cases-plugin/server/mocks';
import { createCasesClientMock } from '@kbn/cases-plugin/server/client/mocks';
import { createActionCreateServiceMock } from './services/actions/mocks';
import { getEndpointAuthzInitialStateMock } from '../../common/endpoint/service/authz/mocks';
import { xpackMocks } from '../fixtures';
import { createMockConfig, requestContextMock } from '../lib/detection_engine/routes/__mocks__';
import type {
  EndpointAppContextService,
  EndpointAppContextServiceSetupContract,
  EndpointAppContextServiceStartContract,
} from './endpoint_app_context_services';
import type { ManifestManager } from './services/artifacts/manifest_manager/manifest_manager';
import { getManifestManagerMock } from './services/artifacts/manifest_manager/manifest_manager.mock';
import type { EndpointAppContext } from './types';
import type { SecuritySolutionRequestHandlerContext } from '../types';
import {
  allowedExperimentalValues,
  parseExperimentalConfigValue,
} from '../../common/experimental_features';
import { requestContextFactoryMock } from '../request_context_factory.mock';
import { EndpointMetadataService } from './services/metadata';
import { createMockClients } from '../lib/detection_engine/routes/__mocks__/request_context';
import { createEndpointMetadataServiceTestContextMock } from './services/metadata/mocks';

import type { EndpointAuthz } from '../../common/endpoint/types/authz';
import { EndpointFleetServicesFactory } from './services/fleet';
import { createLicenseServiceMock } from '../../common/license/mocks';
import { createFeatureUsageServiceMock } from './services/feature_usage/mocks';

/**
 * Creates a mocked EndpointAppContext.
 */
export const createMockEndpointAppContext = (
  mockManifestManager?: ManifestManager
): EndpointAppContext => {
  const config = createMockConfig();

  return {
    logFactory: loggingSystemMock.create(),
    config: () => Promise.resolve(config),
    serverConfig: config,
    service: createMockEndpointAppContextService(mockManifestManager),
    experimentalFeatures: parseExperimentalConfigValue(config.enableExperimental),
  };
};

/**
 * Creates a mocked EndpointAppContextService
 */
export const createMockEndpointAppContextService = (
  mockManifestManager?: ManifestManager
): jest.Mocked<EndpointAppContextService> => {
  const mockEndpointMetadataContext = createEndpointMetadataServiceTestContextMock();
  const casesClientMock = createCasesClientMock();
  const fleetFilesClientMock = createFleetFilesClientMock();

  return {
    start: jest.fn(),
    stop: jest.fn(),
    experimentalFeatures: {
      ...allowedExperimentalValues,
    },
    getManifestManager: jest.fn().mockReturnValue(mockManifestManager ?? jest.fn()),
    getEndpointMetadataService: jest.fn(() => mockEndpointMetadataContext.endpointMetadataService),
    getInternalFleetServices: jest.fn(() => mockEndpointMetadataContext.fleetServices),
    getEndpointAuthz: jest.fn(async (_) => getEndpointAuthzInitialStateMock()),
    getCasesClient: jest.fn().mockReturnValue(casesClientMock),
    getActionCreateService: jest.fn().mockReturnValue(createActionCreateServiceMock()),
    getFleetFilesClient: jest.fn(async (_) => fleetFilesClientMock),
    setup: jest.fn(),
    getLicenseService: jest.fn(),
    getFeatureUsageService: jest.fn(),
    getExceptionListsClient: jest.fn(),
    getMessageSigningService: jest.fn(),
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

    security.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(
      jest.fn(() => ({ privileges: { kibana: [] } }))
    );

    const casesMock = casesPluginMock.createStartContract();

    return {
      endpointMetadataService,
      endpointFleetServicesFactory,
      logger,
      fleetAuthzService: createFleetAuthzServiceMock(),
      createFleetFilesClient: jest.fn((..._) => createFleetFilesClientMock()),
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
      cases: casesMock,
      cloud: cloudMock.createSetup(),
      featureUsageService: createFeatureUsageServiceMock(),
      experimentalFeatures: createMockConfig().experimentalFeatures,
      messageSigningService: createMessageSigningServiceMock(),
      actionCreateService: undefined,
    };
  };

export const createFleetAuthzServiceMock = (): jest.Mocked<FleetStartContract['authz']> => {
  return {
    fromRequest: jest.fn(async (_) => createFleetAuthzMock()),
  };
};

export const createMockMetadataRequestContext = () => {
  return {
    endpointAppContextService: createMockEndpointAppContextService(),
    logger: loggingSystemMock.create().get('mock_endpoint_app_context'),
    requestHandlerContext: xpackMocks.createRequestHandlerContext() as unknown as jest.Mocked<
      AwaitedProperties<SecuritySolutionRequestHandlerContext>
    >,
  };
};

export function createRouteHandlerContext(
  dataClient: ScopedClusterClientMock,
  savedObjectsClient: jest.Mocked<SavedObjectsClientContract>,
  overrides: { endpointAuthz?: Partial<EndpointAuthz> } = {}
) {
  const context = requestContextMock.create(createMockClients(), overrides);
  context.core.elasticsearch.client = dataClient;
  context.core.savedObjects.client = savedObjectsClient;
  return context;
}

export interface HttpApiTestSetupMock<P = any, Q = any, B = any> {
  routerMock: ReturnType<typeof httpServiceMock.createRouter>;
  scopedEsClusterClientMock: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
  savedObjectClientMock: ReturnType<typeof savedObjectsClientMock.create>;
  endpointAppContextMock: EndpointAppContext;
  httpResponseMock: ReturnType<typeof httpServerMock.createResponseFactory>;
  httpHandlerContextMock: ReturnType<typeof requestContextMock.convertContext>;
  getEsClientMock: (type?: 'internalUser' | 'currentUser') => ElasticsearchClientMock;
  createRequestMock: (options?: RequestFixtureOptions<P, Q, B>) => KibanaRequest<P, Q, B>;
  /** Retrieves the handler that was registered with the `router` for a given `method` and `path` */
  getRegisteredRouteHandler: (
    method: keyof Pick<IRouter, 'get' | 'put' | 'post' | 'patch' | 'delete'>,
    path: string
  ) => RequestHandler;
  /** Retrieves the route handler configuration that was registered with the router */
  getRegisteredRouteConfig: (
    method: keyof Pick<IRouter, 'get' | 'put' | 'post' | 'patch' | 'delete'>,
    path: string
  ) => RouteConfig<any, any, any, any>;
}

/**
 * Returns all of the setup needed to test an HTTP api handler
 */
export const createHttpApiTestSetupMock = <P = any, Q = any, B = any>(): HttpApiTestSetupMock<
  P,
  Q,
  B
> => {
  const routerMock = httpServiceMock.createRouter();
  const endpointAppContextMock = createMockEndpointAppContext();
  const scopedEsClusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
  const savedObjectClientMock = savedObjectsClientMock.create();
  const httpHandlerContextMock = requestContextMock.convertContext(
    createRouteHandlerContext(scopedEsClusterClientMock, savedObjectClientMock)
  );
  const httpResponseMock = httpServerMock.createResponseFactory();
  const getRegisteredRouteHandler: HttpApiTestSetupMock['getRegisteredRouteHandler'] = (
    method,
    path
  ): RequestHandler => {
    const methodCalls = routerMock[method].mock.calls as Array<
      [route: RouteConfig<unknown, unknown, unknown, typeof method>, handler: RequestHandler]
    >;
    const handler = methodCalls.find(([routeConfig]) => routeConfig.path.startsWith(path));

    if (!handler) {
      throw new Error(`Handler for [${method}][${path}] not found`);
    }

    return handler[1];
  };
  const getRegisteredRouteConfig: HttpApiTestSetupMock['getRegisteredRouteConfig'] = (
    method,
    path
  ): RouteConfig<any, any, any, any> => {
    const methodCalls = routerMock[method].mock.calls as Array<
      [route: RouteConfig<unknown, unknown, unknown, typeof method>, handler: RequestHandler]
    >;
    const handler = methodCalls.find(([routeConfig]) => routeConfig.path.startsWith(path));

    if (!handler) {
      throw new Error(`Handler for [${method}][${path}] not found`);
    }

    return handler[0];
  };

  return {
    routerMock,

    endpointAppContextMock,
    scopedEsClusterClientMock,
    savedObjectClientMock,

    httpHandlerContextMock,
    httpResponseMock,

    createRequestMock: (options: RequestFixtureOptions<P, Q, B> = {}): KibanaRequest<P, Q, B> => {
      return httpServerMock.createKibanaRequest<P, Q, B>(options);
    },

    getEsClientMock: (
      type: 'internalUser' | 'currentUser' = 'internalUser'
    ): ElasticsearchClientMock => {
      return type === 'currentUser'
        ? scopedEsClusterClientMock.asCurrentUser
        : scopedEsClusterClientMock.asInternalUser;
    },

    getRegisteredRouteHandler,
    getRegisteredRouteConfig,
  };
};
