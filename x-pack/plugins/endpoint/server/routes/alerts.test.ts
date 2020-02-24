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
  RequestHandler,
  RequestHandlerContext,
  RouteConfig,
} from 'kibana/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingServiceMock,
} from '../../../../../src/core/server/mocks';
import { AlertData, AlertResultList } from '../../common/types';
import { SearchResponse } from 'elasticsearch';
import { reqSchema, registerAlertRoutes } from './alerts';
import { EndpointConfigSchema } from '../config';
import * as data from '../test_data/all_alerts_data.json';
import * as dataLegacy from '../test_data/all_alerts_data_legacy.json';

describe('test alerts route', () => {
  let routerMock: jest.Mocked<IRouter>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let mockClusterClient: jest.Mocked<IClusterClient>;
  let mockScopedClient: jest.Mocked<IScopedClusterClient>;
  let routeHandler: RequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any, any>;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
    routerMock = httpServiceMock.createRouter();
    mockResponse = httpServerMock.createResponseFactory();
    registerAlertRoutes(routerMock, {
      logFactory: loggingServiceMock.create(),
      config: () => Promise.resolve(EndpointConfigSchema.validate({})),
    });
  });

  it('should correctly calculate legacy alert total', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({});

    const response: SearchResponse<AlertData> = (dataLegacy as unknown) as SearchResponse<
      AlertData
    >;
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/alerts')
    )!;

    await routeHandler(
      ({
        core: {
          elasticsearch: {
            dataClient: mockScopedClient,
          },
        },
      } as unknown) as RequestHandlerContext,
      mockRequest,
      mockResponse
    );

    expect(mockScopedClient.callAsCurrentUser).toBeCalled();
    expect(routeConfig.options).toEqual({ authRequired: true });
    expect(mockResponse.ok).toBeCalled();
    const alertResultList = mockResponse.ok.mock.calls[0][0]?.body as AlertResultList;
    expect(alertResultList.total).toEqual(21);
    expect(alertResultList.request_page_index).toEqual(0);
    expect(alertResultList.result_from_index).toEqual(0);
    expect(alertResultList.request_page_size).toEqual(10);
  });

  it('should return the latest of all alerts', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({});

    const response: SearchResponse<AlertData> = (data as unknown) as SearchResponse<AlertData>;
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/alerts')
    )!;

    await routeHandler(
      ({
        core: {
          elasticsearch: {
            dataClient: mockScopedClient,
          },
        },
      } as unknown) as RequestHandlerContext,
      mockRequest,
      mockResponse
    );

    expect(mockScopedClient.callAsCurrentUser).toBeCalled();
    expect(routeConfig.options).toEqual({ authRequired: true });
    expect(mockResponse.ok).toBeCalled();
    const alertResultList = mockResponse.ok.mock.calls[0][0]?.body as AlertResultList;
    expect(alertResultList.total).toEqual(21);
    expect(alertResultList.request_page_index).toEqual(0);
    expect(alertResultList.result_from_index).toEqual(0);
    expect(alertResultList.request_page_size).toEqual(10);
  });

  it('should return alert results according to pagination params -- POST', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'post',
      body: {
        page_size: 6,
        page_index: 3,
      },
    });
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(data));
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/alerts')
    )!;

    await routeHandler(
      ({
        core: {
          elasticsearch: {
            dataClient: mockScopedClient,
          },
        },
      } as unknown) as RequestHandlerContext,
      mockRequest,
      mockResponse
    );

    expect(mockScopedClient.callAsCurrentUser).toBeCalled();
    expect(routeConfig.options).toEqual({ authRequired: true });
    expect(mockResponse.ok).toBeCalled();
    const alertResultList = mockResponse.ok.mock.calls[0][0]?.body as AlertResultList;
    expect(alertResultList.total).toEqual(21);
    expect(alertResultList.request_page_index).toEqual(3);
    expect(alertResultList.result_from_index).toEqual(18);
    expect(alertResultList.request_page_size).toEqual(6);
  });

  it('should return alert results according to pagination params -- GET', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      path: '/api/endpoint/alerts',
      query: {
        page_size: 3,
        page_index: 2,
      },
    });
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(data));
    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/alerts')
    )!;

    await routeHandler(
      ({
        core: {
          elasticsearch: {
            dataClient: mockScopedClient,
          },
        },
      } as unknown) as RequestHandlerContext,
      mockRequest,
      mockResponse
    );

    expect(mockScopedClient.callAsCurrentUser).toBeCalled();
    expect(routeConfig.options).toEqual({ authRequired: true });
    expect(mockResponse.ok).toBeCalled();
    const alertResultList = mockResponse.ok.mock.calls[0][0]?.body as AlertResultList;
    expect(alertResultList.total).toEqual(21);
    expect(alertResultList.request_page_index).toEqual(2);
    expect(alertResultList.result_from_index).toEqual(6);
    expect(alertResultList.request_page_size).toEqual(3);
  });

  it('should correctly validate params', async () => {
    const validate = () => {
      reqSchema.validate({
        page_size: 'abc',
        page_index: 0,
      });
    };
    expect(validate).toThrow();
  });
});
