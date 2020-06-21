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
} from 'src/core/server/mocks';
import { ExceptionsCache } from '../../lib/artifacts/cache';
import { CompressExceptionList } from '../../lib/artifacts/lists';
import { ArtifactConstants } from '../../lib/artifacts';
import { registerDownloadExceptionListRoute } from './download_exception_list';

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
  let cache: ExceptionsCache;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockSavedObjectClient = savedObjectsClientMock.create();
    mockResponse = httpServerMock.createResponseFactory();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
    routerMock = httpServiceMock.createRouter();
    cache = new ExceptionsCache(10000); // TODO

    registerDownloadExceptionListRoute(routerMock, cache);
  });

  it('should serve the compressed artifact to download', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      path: `/api/endpoint/allowlist/download/${mockArtifactName}/123456`,
      method: 'get',
      params: { sha256: '123456' },
    });

    const mockCompressedArtifact = await CompressExceptionList(expectedEndpointExceptions);

    const mockArtifact = {
      id: '2468',
      type: 'test',
      references: [],
      attributes: {
        name: mockArtifactName,
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

  it('should handle a sha256 mismatch', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      path: `/api/endpoint/allowlist/download/${mockArtifactName}/123456`,
      method: 'get',
      params: { sha256: '789' },
    });

    const mockCompressedArtifact = await CompressExceptionList(expectedEndpointExceptions);

    const mockArtifact = {
      id: '2468',
      type: 'test',
      references: [],
      attributes: {
        name: mockArtifactName,
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
    expect(mockResponse.notFound).toBeCalled();
  });

  it('should utilize the cache', async () => {
    const mockSha = '123456789';
    const mockRequest = httpServerMock.createKibanaRequest({
      path: `/api/endpoint/allowlist/download/${mockArtifactName}/${mockSha}`,
      method: 'get',
      params: { sha256: mockSha, artifactName: mockArtifactName },
    });

    // Add to the download cache
    const mockCompressedArtifact = await CompressExceptionList(expectedEndpointExceptions);
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
