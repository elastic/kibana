/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
  savedObjectsServiceMock,
  securityServiceMock,
  coreMock,
} from '@kbn/core/server/mocks';
import type {
  IRouter,
  KibanaRequest,
  RequestHandler,
  RouteConfig,
  RouteMethod,
  SavedObjectsClientContract,
  SecurityServiceStart,
} from '@kbn/core/server';
import { listMock } from '@kbn/lists-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import {
  createFleetActionsClientMock,
  createFleetFromHostFilesClientMock,
  createFleetStartContractMock,
  createFleetToHostFilesClientMock,
  createMessageSigningServiceMock,
  createPackagePolicyServiceMock,
} from '@kbn/fleet-plugin/server/mocks';
import type { RequestFixtureOptions, RouterMock } from '@kbn/core-http-router-server-mocks';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { casesPluginMock } from '@kbn/cases-plugin/server/mocks';
import { createCasesClientMock } from '@kbn/cases-plugin/server/client/mocks';
import type { AddVersionOpts, VersionedRouteConfig } from '@kbn/core-http-server';
import { unsecuredActionsClientMock } from '@kbn/actions-plugin/server/unsecured_actions_client/unsecured_actions_client.mock';
import type { PluginStartContract as ActionPluginStartContract } from '@kbn/actions-plugin/server';
import type { Mutable } from 'utility-types';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import type { ProductFeaturesService } from '../../lib/product_features_service';
import { responseActionsClientMock } from '../services/actions/clients/mocks';
import { getEndpointAuthzInitialStateMock } from '../../../common/endpoint/service/authz/mocks';
import { createMockConfig, requestContextMock } from '../../lib/detection_engine/routes/__mocks__';
import type {
  EndpointAppContextService,
  EndpointAppContextServiceSetupContract,
  EndpointAppContextServiceStartContract,
} from '../endpoint_app_context_services';
import type { ManifestManager } from '../services/artifacts/manifest_manager/manifest_manager';
import { getManifestManagerMock } from '../services/artifacts/manifest_manager/manifest_manager.mock';
import type { EndpointAppContext } from '../types';
import {
  allowedExperimentalValues,
  parseExperimentalConfigValue,
} from '../../../common/experimental_features';
import { requestContextFactoryMock } from '../../request_context_factory.mock';
import type { SecuritySolutionRequestHandlerContextMock } from '../../lib/detection_engine/routes/__mocks__/request_context';
import { createMockClients } from '../../lib/detection_engine/routes/__mocks__/request_context';
import { createEndpointMetadataServiceTestContextMock } from '../services/metadata/mocks';
import type { EndpointAuthz } from '../../../common/endpoint/types/authz';
import { createLicenseServiceMock } from '../../../common/license/mocks';
import { createFeatureUsageServiceMock } from '../services/feature_usage/mocks';
import { createProductFeaturesServiceMock } from '../../lib/product_features_service/mocks';

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
    experimentalFeatures: parseExperimentalConfigValue(config.enableExperimental).features,
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
  const fleetFromHostFilesClientMock = createFleetFromHostFilesClientMock();
  const fleetToHostFilesClientMock = createFleetToHostFilesClientMock();
  const fleetActionsClientMock = createFleetActionsClientMock();
  const loggerFactory = loggingSystemMock.create();
  const featureUsageMock = createFeatureUsageServiceMock();
  const messageSigningService = createMessageSigningServiceMock();
  const licenseServiceMock = createLicenseServiceMock();

  return {
    start: jest.fn(),
    stop: jest.fn(),
    experimentalFeatures: {
      ...allowedExperimentalValues,
    },
    createLogger: jest.fn((...parts) => loggerFactory.get(...parts)),
    getManifestManager: jest.fn().mockReturnValue(mockManifestManager ?? jest.fn()),
    getEndpointMetadataService: jest.fn(() => mockEndpointMetadataContext.endpointMetadataService),
    getInternalFleetServices: jest.fn(() => mockEndpointMetadataContext.fleetServices),
    getEndpointAuthz: jest.fn(async (_) => getEndpointAuthzInitialStateMock()),
    getCasesClient: jest.fn().mockReturnValue(casesClientMock),
    getFleetFromHostFilesClient: jest.fn(async () => fleetFromHostFilesClientMock),
    getFleetToHostFilesClient: jest.fn(async () => fleetToHostFilesClientMock),
    setup: jest.fn(),
    getLicenseService: jest.fn().mockReturnValue(licenseServiceMock),
    getFeatureUsageService: jest.fn().mockReturnValue(featureUsageMock),
    getExceptionListsClient: jest.fn(),
    getMessageSigningService: jest.fn().mockReturnValue(messageSigningService),
    getFleetActionsClient: jest.fn(async (_) => fleetActionsClientMock),
    getInternalResponseActionsClient: jest.fn(() => {
      return responseActionsClientMock.create();
    }),
  } as unknown as jest.Mocked<EndpointAppContextService>;
};

/**
 * Creates a mocked input contract for the `EndpointAppContextService#setup()` method
 */
export const createMockEndpointAppContextServiceSetupContract =
  (): jest.Mocked<EndpointAppContextServiceSetupContract> => {
    return {
      securitySolutionRequestContextFactory: requestContextFactoryMock.create(),
      cloud: cloudMock.createSetup(),
      loggerFactory: loggingSystemMock.create(),
      httpServiceSetup: coreMock.createSetup().http,
    };
  };

/**
 * Creates a mocked input contract for the `EndpointAppContextService#start()` method
 */
export const createMockEndpointAppContextServiceStartContract =
  (): DeeplyMockedKeys<EndpointAppContextServiceStartContract> => {
    const config = createMockConfig();

    const logger = loggingSystemMock.create().get('mock_endpoint_app_context');
    const security =
      securityServiceMock.createStart() as unknown as DeeplyMockedKeys<SecurityServiceStart>;
    const packagePolicyService = createPackagePolicyServiceMock();

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

    const startContract: DeeplyMockedKeys<EndpointAppContextServiceStartContract> = {
      security,
      config,
      productFeaturesService: createProductFeaturesServiceMock(
        undefined,
        config.experimentalFeatures,
        undefined,
        logger
      ) as DeeplyMockedKeys<ProductFeaturesService>,
      experimentalFeatures: config.experimentalFeatures,
      fleetStartServices: createFleetStartContractMock(),
      cases: casesPluginMock.createStartContract(),
      manifestManager: getManifestManagerMock() as DeeplyMockedKeys<ManifestManager>,
      alerting: alertsMock.createStart(),
      licenseService: createLicenseServiceMock(),
      exceptionListsClient: listMock.getExceptionListClient(),
      featureUsageService: createFeatureUsageServiceMock(),
      esClient: elasticsearchClientMock.createElasticsearchClient(),
      savedObjectsServiceStart: savedObjectsServiceMock.createStartContract(),
      connectorActions: {
        getUnsecuredActionsClient: jest.fn().mockReturnValue(unsecuredActionsClientMock.create()),
      } as unknown as jest.Mocked<ActionPluginStartContract>,
    };

    return startContract;
  };

export function createRouteHandlerContext(
  dataClient: ScopedClusterClientMock,
  savedObjectsClient: jest.Mocked<SavedObjectsClientContract>,
  overrides: { endpointAuthz?: Partial<EndpointAuthz> } = {}
): SecuritySolutionRequestHandlerContextMock {
  const context = requestContextMock.create(createMockClients(), overrides);

  context.core.elasticsearch.client = dataClient;
  context.core.savedObjects.client = savedObjectsClient;

  return context;
}

type RouterMethod = Extract<keyof IRouter, RouteMethod>;

export interface HttpApiTestSetupMock<P = any, Q = any, B = any> {
  routerMock: RouterMock;
  scopedEsClusterClientMock: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
  savedObjectClientMock: ReturnType<typeof savedObjectsClientMock.create>;
  endpointAppContextMock: EndpointAppContext;
  httpResponseMock: ReturnType<typeof httpServerMock.createResponseFactory>;
  httpHandlerContextMock: ReturnType<typeof requestContextMock.convertContext>;
  getEsClientMock: (type?: 'internalUser' | 'currentUser') => ElasticsearchClientMock;
  createRequestMock: (options?: RequestFixtureOptions<P, Q, B>) => Mutable<KibanaRequest<P, Q, B>>;
  /** Retrieves the handler that was registered with the `router` for a given `method` and `path` */
  getRegisteredRouteHandler: (method: RouterMethod, path: string) => RequestHandler;
  /** Retrieves the route handler configuration that was registered with the router */
  getRegisteredRouteConfig: (method: RouterMethod, path: string) => RouteConfig<any, any, any, any>;
  /** Sets endpoint authz overrides on the data returned by `EndpointAppContext.services.getEndpointAuthz()` */
  setEndpointAuthz: (overrides: Partial<EndpointAuthz>) => void;
  /** Get a registered versioned route */
  getRegisteredVersionedRoute: (
    method: RouterMethod,
    path: string,
    version: string
  ) => RegisteredVersionedRoute;
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
  const endpointAuthz = getEndpointAuthzInitialStateMock();
  const httpHandlerContextMock = requestContextMock.convertContext(
    createRouteHandlerContext(scopedEsClusterClientMock, savedObjectClientMock, { endpointAuthz })
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
  const setEndpointAuthz = (overrides: Partial<EndpointAuthz>) => {
    Object.assign(endpointAuthz, overrides);
  };

  (endpointAppContextMock.service.getEndpointAuthz as jest.Mock).mockResolvedValue(endpointAuthz);

  return {
    routerMock,

    endpointAppContextMock,
    scopedEsClusterClientMock,
    savedObjectClientMock,

    httpHandlerContextMock,
    httpResponseMock,

    createRequestMock: (
      options: RequestFixtureOptions<P, Q, B> = {}
    ): Mutable<KibanaRequest<P, Q, B>> => {
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
    setEndpointAuthz,

    getRegisteredVersionedRoute: getRegisteredVersionedRouteMock.bind(null, routerMock),
  };
};

interface RegisteredVersionedRoute {
  routeConfig: VersionedRouteConfig<RouterMethod>;
  versionConfig: AddVersionOpts<any, any, any>;
  routeHandler: RequestHandler<any, any, any, any, any>;
}

export const getRegisteredVersionedRouteMock = (
  routerMock: RouterMock,
  method: RouterMethod,
  path: string,
  version: string
): RegisteredVersionedRoute => {
  const route = routerMock.versioned.getRoute(method, path);
  const routeVersion = route.versions[version];

  if (!routeVersion) {
    throw new Error(`Handler for [${method}][${path}] with version [${version}] no found!`);
  }

  return {
    routeConfig: route.config,
    versionConfig: routeVersion.config,
    routeHandler: routeVersion.handler,
  };
};
