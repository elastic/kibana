/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  IClusterClient,
  IRouter,
  SavedObjectsClientContract,
  IScopedClusterClient,
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
  loggingServiceMock,
} from 'src/core/server/mocks';
import { ExceptionsCache } from '../../lib/artifacts/cache';
import { compressExceptionList } from '../../lib/artifacts/lists';
import { ArtifactConstants } from '../../lib/artifacts';
import { registerDownloadExceptionListRoute } from './download_exception_list';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import { createMockAgentService } from '../../mocks';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';

const mockArtifactName = `${ArtifactConstants.GLOBAL_ALLOWLIST_NAME}-windows-1.0.0`;
const expectedEndpointExceptions = {
  exceptions_list: [
    {
      entries: [
        {
          entry: { exact_caseless: 'Elastic, N.V.' },
          field: 'actingProcess.file.signer',
          operator: 'included',
        },
        {
          entry: { exact_caseless_any: ['process', 'malware'] },
          field: 'event.category',
          operator: 'included',
        },
      ],
      type: 'simple',
    },
  ],
};

describe('test alerts route', () => {
  let routerMock: jest.Mocked<IRouter>;
  let mockClusterClient: jest.Mocked<IClusterClient>;
  let mockScopedClient: jest.Mocked<IScopedClusterClient>;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let routeConfig: RouteConfig<unknown, unknown, unknown, never>;
  let routeHandler: RequestHandler<unknown, unknown, unknown>;
  let endpointAppContextService: EndpointAppContextService;
  let cache: ExceptionsCache;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockSavedObjectClient = savedObjectsClientMock.create();
    mockResponse = httpServerMock.createResponseFactory();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
    routerMock = httpServiceMock.createRouter();
    endpointAppContextService = new EndpointAppContextService();
    cache = new ExceptionsCache();
    loggingServiceMock.createSetupContract();

    endpointAppContextService.start({
      agentService: createMockAgentService(),
      manifestManager: undefined,
    });

    registerDownloadExceptionListRoute(
      routerMock,
      {
        logFactory: loggingServiceMock.create(),
        service: endpointAppContextService,
        config: () => Promise.resolve(createMockConfig()),
      },
      cache
    );
  });

  it('should serve the compressed artifact to download', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      path: `/api/endpoint/allowlist/download/${mockArtifactName}/123456`,
      method: 'get',
      params: { sha256: '123456' },
    });

    const mockCompressedArtifact = await compressExceptionList(expectedEndpointExceptions);

    const mockArtifact = {
      id: '2468',
      type: 'test',
      references: [],
      attributes: {
        identifier: mockArtifactName,
        schemaVersion: '1.0.0',
        sha256: '123456',
        encoding: 'xz',
        created: Date.now(),
        body: mockCompressedArtifact,
        size: 100,
      },
    };

    const soFindResp: SavedObject<unknown> = {
      ...mockArtifact,
    };

    mockSavedObjectClient.get.mockImplementationOnce(() => Promise.resolve(soFindResp));

    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/allowlist/download')
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

    const expectedHeaders = {
      'content-encoding': 'xz',
      'content-disposition': `attachment; filename=${mockArtifactName}.xz`,
    };

    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]?.headers).toEqual(expectedHeaders);
    const compressedArtifact = mockResponse.ok.mock.calls[0][0]?.body;
    expect(compressedArtifact).toEqual(mockCompressedArtifact);
  });

  it('should handle fetching a non-existent artifact', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      path: `/api/endpoint/allowlist/download/${mockArtifactName}/123456`,
      method: 'get',
      params: { sha256: '789' },
    });

    mockSavedObjectClient.get.mockImplementationOnce(() =>
      // eslint-disable-next-line prefer-promise-reject-errors
      Promise.reject({ output: { statusCode: 404 } })
    );

    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/allowlist/download')
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
      path: `/api/endpoint/allowlist/download/${mockArtifactName}/${mockSha}`,
      method: 'get',
      params: { sha256: mockSha, identifier: mockArtifactName },
    });

    // Add to the download cache
    const mockCompressedArtifact = await compressExceptionList(expectedEndpointExceptions);
    const cacheKey = `${mockArtifactName}-${mockSha}`;
    cache.set(cacheKey, mockCompressedArtifact.toString('binary'));

    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/allowlist/download')
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
    expect(mockSavedObjectClient.get.mock.calls.length).toEqual(0);
  });
});
