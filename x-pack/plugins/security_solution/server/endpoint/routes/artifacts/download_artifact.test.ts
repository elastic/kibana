/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deflateSync, inflateSync } from 'zlib';
import LRU from 'lru-cache';
import type {
  ILegacyClusterClient,
  IRouter,
  SavedObjectsClientContract,
  ILegacyScopedClusterClient,
  RouteConfig,
  RequestHandler,
  KibanaResponseFactory,
  SavedObject,
} from 'kibana/server';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  httpServiceMock,
  httpServerMock,
  loggingSystemMock,
} from 'src/core/server/mocks';
import { parseExperimentalConfigValue } from '../../../../common/experimental_features';
import { ArtifactConstants } from '../../lib/artifacts';
import { registerDownloadArtifactRoute } from './download_artifact';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import { createMockEndpointAppContextServiceStartContract } from '../../mocks';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import { WrappedTranslatedExceptionList } from '../../schemas/artifacts/lists';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';

const mockArtifactName = `${ArtifactConstants.GLOBAL_ALLOWLIST_NAME}-windows-v1`;
const expectedEndpointExceptions: WrappedTranslatedExceptionList = {
  entries: [
    {
      type: 'simple',
      entries: [
        {
          entries: [
            {
              field: 'some.not.nested.field',
              operator: 'included',
              type: 'exact_cased',
              value: 'some value',
            },
          ],
          field: 'some.field',
          type: 'nested',
        },
        {
          field: 'some.not.nested.field',
          operator: 'included',
          type: 'exact_cased',
          value: 'some value',
        },
      ],
    },
    {
      type: 'simple',
      entries: [
        {
          field: 'some.other.not.nested.field',
          operator: 'included',
          type: 'exact_cased',
          value: 'some other value',
        },
      ],
    },
  ],
};
const mockFleetESResponse = {
  body: {
    hits: {
      hits: [
        {
          _id: 'agent1',
          _source: {
            active: true,
            access_api_key_id: 'pedTuHIBTEDt93wW0Fhr',
          },
        },
      ],
    },
  },
};

const AuthHeader = 'ApiKey cGVkVHVISUJURUR0OTN3VzBGaHI6TnU1U0JtbHJSeC12Rm9qQWpoSHlUZw==';

describe('test alerts route', () => {
  let routerMock: jest.Mocked<IRouter>;
  let mockClusterClient: jest.Mocked<ILegacyClusterClient>;
  let mockScopedClient: jest.Mocked<ILegacyScopedClusterClient>;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let routeConfig: RouteConfig<unknown, unknown, unknown, never>;
  let routeHandler: RequestHandler<unknown, unknown, unknown>;
  let endpointAppContextService: EndpointAppContextService;
  let cache: LRU<string, Buffer>;
  let ingestSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  let esClientMock: ReturnType<typeof elasticsearchServiceMock.createInternalClient>;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createLegacyClusterClient();
    mockScopedClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
    mockSavedObjectClient = savedObjectsClientMock.create();
    mockResponse = httpServerMock.createResponseFactory();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
    routerMock = httpServiceMock.createRouter();
    endpointAppContextService = new EndpointAppContextService();
    cache = new LRU<string, Buffer>({ max: 10, maxAge: 1000 * 60 * 60 });
    const startContract = createMockEndpointAppContextServiceStartContract();

    // // The authentication with the Fleet Plugin needs a separate scoped ES CLient
    esClientMock = elasticsearchServiceMock.createInternalClient();
    // @ts-expect-error
    esClientMock.search.mockResolvedValue(mockFleetESResponse);

    ingestSavedObjectClient = savedObjectsClientMock.create();
    (startContract.savedObjectsStart.getScopedClient as jest.Mock).mockReturnValue(
      ingestSavedObjectClient
    );
    endpointAppContextService.start(startContract);

    registerDownloadArtifactRoute(
      routerMock,
      {
        logFactory: loggingSystemMock.create(),
        service: endpointAppContextService,
        config: () => Promise.resolve(createMockConfig()),
        experimentalFeatures: parseExperimentalConfigValue(createMockConfig().enableExperimental),
      },
      cache
    );
  });

  it('should serve the artifact to download', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      path: `/api/endpoint/artifacts/download/${mockArtifactName}/123456`,
      method: 'get',
      params: { sha256: '123456' },
      headers: {
        authorization: AuthHeader,
      },
    });

    // Mock the SavedObjectsClient get response for fetching the artifact
    const mockArtifact = {
      id: '2468',
      type: 'test',
      references: [],
      attributes: {
        identifier: mockArtifactName,
        schemaVersion: 'v1',
        sha256: '123456',
        encoding: 'application/json',
        created: Date.now(),
        body: deflateSync(JSON.stringify(expectedEndpointExceptions)).toString('base64'),
        size: 100,
      },
    };
    const soFindResp: SavedObject<unknown> = {
      ...mockArtifact,
    };
    ingestSavedObjectClient.get.mockImplementationOnce(() => Promise.resolve(soFindResp));

    // This workaround is only temporary. The endpoint `ArtifactClient` will be removed soon
    // and this entire test file refactored to start using fleet's exposed FleetArtifactClient class.
    endpointAppContextService!
      .getManifestManager()!
      .getArtifactsClient().getArtifact = jest.fn().mockResolvedValue(soFindResp.attributes);

    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/artifacts/download')
    )!;

    expect(routeConfig.options).toEqual({ tags: ['endpoint:limited-concurrency'] });

    await routeHandler(
      ({
        core: {
          savedObjects: {
            client: mockSavedObjectClient,
          },
          elasticsearch: {
            client: { asInternalUser: esClientMock },
          },
        },
      } as unknown) as SecuritySolutionRequestHandlerContext,
      mockRequest,
      mockResponse
    );

    const expectedHeaders = {
      'content-encoding': 'identity',
      'content-disposition': `attachment; filename=${mockArtifactName}.zz`,
    };

    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]?.headers).toEqual(expectedHeaders);
    const artifact = inflateSync(mockResponse.ok.mock.calls[0][0]?.body as Buffer).toString();
    expect(artifact).toEqual(
      inflateSync(Buffer.from(mockArtifact.attributes.body, 'base64')).toString()
    );
  });

  it('should handle fetching a non-existent artifact', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      path: `/api/endpoint/artifacts/download/${mockArtifactName}/123456`,
      method: 'get',
      params: { sha256: '789' },
      headers: {
        authorization: AuthHeader,
      },
    });

    ingestSavedObjectClient.get.mockImplementationOnce(() =>
      // eslint-disable-next-line prefer-promise-reject-errors
      Promise.reject({ output: { statusCode: 404 } })
    );

    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/artifacts/download')
    )!;

    await routeHandler(
      ({
        core: {
          savedObjects: {
            client: mockSavedObjectClient,
          },
          elasticsearch: {
            client: { asInternalUser: esClientMock },
          },
        },
      } as unknown) as SecuritySolutionRequestHandlerContext,
      mockRequest,
      mockResponse
    );
    expect(mockResponse.notFound).toBeCalled();
  });

  it('should utilize the cache', async () => {
    const mockSha = '123456789';
    const mockRequest = httpServerMock.createKibanaRequest({
      path: `/api/endpoint/artifacts/download/${mockArtifactName}/${mockSha}`,
      method: 'get',
      params: { sha256: mockSha, identifier: mockArtifactName },
      headers: {
        authorization: AuthHeader,
      },
    });

    // Add to the download cache
    const mockArtifact = expectedEndpointExceptions;
    const cacheKey = `${mockArtifactName}-${mockSha}`;
    cache.set(cacheKey, Buffer.from(JSON.stringify(mockArtifact))); // TODO: add compression here

    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/artifacts/download')
    )!;

    await routeHandler(
      ({
        core: {
          savedObjects: {
            client: mockSavedObjectClient,
          },
          elasticsearch: {
            client: { asInternalUser: esClientMock },
          },
        },
      } as unknown) as SecuritySolutionRequestHandlerContext,
      mockRequest,
      mockResponse
    );
    expect(mockResponse.ok).toBeCalled();
    // The saved objects client should be bypassed as the cache will contain the download
    expect(ingestSavedObjectClient.get.mock.calls.length).toEqual(0);
  });

  it('should respond with a 401 if a valid API Token is not supplied', async () => {
    const mockSha = '123456789';
    const mockRequest = httpServerMock.createKibanaRequest({
      path: `/api/endpoint/artifacts/download/${mockArtifactName}/${mockSha}`,
      method: 'get',
      params: { sha256: mockSha, identifier: mockArtifactName },
    });

    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/artifacts/download')
    )!;

    await routeHandler(
      ({
        core: {
          savedObjects: {
            client: mockSavedObjectClient,
          },
          elasticsearch: {
            client: { asInternalUser: esClientMock },
          },
        },
      } as unknown) as SecuritySolutionRequestHandlerContext,
      mockRequest,
      mockResponse
    );
    expect(mockResponse.unauthorized).toBeCalled();
  });

  it('should respond with a 404 if an agent cannot be linked to the API token', async () => {
    const mockSha = '123456789';
    const mockRequest = httpServerMock.createKibanaRequest({
      path: `/api/endpoint/artifacts/download/${mockArtifactName}/${mockSha}`,
      method: 'get',
      params: { sha256: mockSha, identifier: mockArtifactName },
      headers: {
        authorization: AuthHeader,
      },
    });

    // Mock the SavedObjectsClient find response for verifying the API token with no results
    // @ts-expect-error
    esClientMock.search.mockResolvedValue({ body: { hits: { hits: [] } } });

    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/artifacts/download')
    )!;

    await routeHandler(
      ({
        core: {
          savedObjects: {
            client: mockSavedObjectClient,
          },
          elasticsearch: {
            client: { asInternalUser: esClientMock },
          },
        },
      } as unknown) as SecuritySolutionRequestHandlerContext,
      mockRequest,
      mockResponse
    );
    expect(mockResponse.notFound).toBeCalled();
  });
});
