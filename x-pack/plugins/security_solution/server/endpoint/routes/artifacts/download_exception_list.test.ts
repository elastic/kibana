/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { deflateSync, inflateSync } from 'zlib';
import {
  ILegacyClusterClient,
  IRouter,
  SavedObjectsClientContract,
  ILegacyScopedClusterClient,
  RouteConfig,
  RequestHandler,
  KibanaResponseFactory,
  RequestHandlerContext,
  SavedObject,
} from 'kibana/server';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  httpServiceMock,
  httpServerMock,
  loggingSystemMock,
} from 'src/core/server/mocks';
import { ExceptionsCache } from '../../lib/artifacts/cache';
import { ArtifactConstants } from '../../lib/artifacts';
import { registerDownloadExceptionListRoute } from './download_exception_list';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import { createMockEndpointAppContextServiceStartContract } from '../../mocks';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import { WrappedTranslatedExceptionList } from '../../schemas/artifacts/lists';

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
const mockIngestSOResponse = {
  page: 1,
  per_page: 100,
  total: 1,
  saved_objects: [
    {
      id: 'agent1',
      type: 'agent',
      references: [],
      score: 0,
      attributes: {
        active: true,
        access_api_key_id: 'pedTuHIBTEDt93wW0Fhr',
      },
    },
  ],
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
  let cache: ExceptionsCache;
  let ingestSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createLegacyClusterClient();
    mockScopedClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
    mockSavedObjectClient = savedObjectsClientMock.create();
    mockResponse = httpServerMock.createResponseFactory();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
    routerMock = httpServiceMock.createRouter();
    endpointAppContextService = new EndpointAppContextService();
    cache = new ExceptionsCache(5);
    const startContract = createMockEndpointAppContextServiceStartContract();

    // The authentication with the Fleet Plugin needs a separate scoped SO Client
    ingestSavedObjectClient = savedObjectsClientMock.create();
    ingestSavedObjectClient.find.mockReturnValue(Promise.resolve(mockIngestSOResponse));
    (startContract.savedObjectsStart.getScopedClient as jest.Mock).mockReturnValue(
      ingestSavedObjectClient
    );
    endpointAppContextService.start(startContract);

    registerDownloadExceptionListRoute(
      routerMock,
      {
        logFactory: loggingSystemMock.create(),
        service: endpointAppContextService,
        config: () => Promise.resolve(createMockConfig()),
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

    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/artifacts/download')
    )!;

    expect(routeConfig.options).toEqual(undefined);

    await routeHandler(
      ({
        core: {
          savedObjects: {
            client: mockSavedObjectClient,
          },
        },
      } as unknown) as RequestHandlerContext,
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
        },
      } as unknown) as RequestHandlerContext,
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
        },
      } as unknown) as RequestHandlerContext,
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
        },
      } as unknown) as RequestHandlerContext,
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
    mockIngestSOResponse.saved_objects = [];
    mockIngestSOResponse.total = 0;
    ingestSavedObjectClient.find.mockReturnValue(Promise.resolve(mockIngestSOResponse));

    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/artifacts/download')
    )!;

    await routeHandler(
      ({
        core: {
          savedObjects: {
            client: mockSavedObjectClient,
          },
        },
      } as unknown) as RequestHandlerContext,
      mockRequest,
      mockResponse
    );
    expect(mockResponse.notFound).toBeCalled();
  });
});
