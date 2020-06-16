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
  SavedObjectsFindResponse,
} from 'kibana/server';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  httpServiceMock,
  httpServerMock,
} from 'src/core/server/mocks';
import { downloadEndpointExceptionList } from './download_endpoint_exception_list';
import { CompressExceptionList } from '../../../exceptions/fetch_endpoint_exceptions';

const mockArtifactName = 'test-artifact-windows';
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

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockSavedObjectClient = savedObjectsClientMock.create();
    mockResponse = httpServerMock.createResponseFactory();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
    routerMock = httpServiceMock.createRouter();

    downloadEndpointExceptionList(routerMock);
  });

  it('should serve the compressed artifact to download', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      path: '/api/endpoint/allowlist/download/123456',
      method: 'get',
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

    const soFindResp: SavedObjectsFindResponse<unknown> = {
      page: 1,
      per_page: 1,
      saved_objects: [mockArtifact],
      total: 1,
    };

    mockSavedObjectClient.find.mockImplementationOnce(() => Promise.resolve(soFindResp));

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
});
