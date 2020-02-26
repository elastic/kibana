/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  IClusterClient,
  IRouter,
  IScopedClusterClient,
  KibanaResponseFactory,
  Endp,
} from 'kibana/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingServiceMock,
} from '../../../../../src/core/server/mocks';
import { registerWhitelistRoutes } from './whitelist';
import { EndpointConfigSchema } from '../config';
import { kibanaResponseFactory, RequestHandler } from 'src/core/server';

describe('test endpoint route', () => {
  let router: jest.Mocked<IRouter>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let mockClusterClient: jest.Mocked<IClusterClient>;
  let mockScopedClient: jest.Mocked<IScopedClusterClient>;
  let ctx: any;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);

    const httpService = httpServiceMock.createSetupContract();
    router = httpService.createRouter('') as jest.Mocked<IRouter>;
    ctx = {
      logFactory: loggingServiceMock.create(),
      config: () => Promise.resolve(EndpointConfigSchema.validate({})),
    };
    registerWhitelistRoutes(router, ctx);
  });

  it('test find the latest of all endpoints', async () => {
    //   const routeHandler = router.post.mock.calls[0][1]
    const mockRequest = httpServerMock.createKibanaRequest({
      path: '/api/endpoint/whitelist',
      method: 'post',
      body: { hello: 'world' },
    });
    //   const response = await routeHandler(ctx, mockRequest, kibanaResponseFactory);

    //   const response: SearchResponse<EndpointMetadata> = (data as unknown) as SearchResponse<EndpointMetadata>;
    //   mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));
    //   [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
    //     path.startsWith('/api/endpoint/whitelist')
    //   )!;

    //   await routeHandler(
    //     ({
    //       core: {
    //         elasticsearch: {
    //           dataClient: mockScopedClient,
    //         },
    //       },
    //     } as unknown) as RequestHandlerContext,
    //     mockRequest,
    //     mockResponse
    //   );

    //   expect(mockScopedClient.callAsCurrentUser).toBeCalled();
    //   expect(routeConfig.options).toEqual({ authRequired: true });
    //   expect(mockResponse.ok.mock.calls).toEqual(2);
    //   expect(endpointResultList.total).toEqual(2);
    //   expect(endpointResultList.request_page_index).toEqual(0);
    //   expect(endpointResultList.request_page_size).toEqual(10);
  });
});
