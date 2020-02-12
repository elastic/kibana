/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { decode, encode } from 'rison-node';
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
} from '../../../../../../src/core/server/mocks';
import { AlertData, AlertResultList } from '../../../common/types';
import { SearchResponse } from 'elasticsearch';
import { alertListReqSchema } from './list/schemas';
import { registerAlertRoutes } from './index';
import { EndpointConfigSchema } from '../../config';
import * as data from '../../test_data/all_alerts_data.json';

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

  it('should return the latest of all alerts', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({});

    const response: SearchResponse<AlertData> = (data as unknown) as SearchResponse<AlertData>;
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));
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

    // NOTE: only check total in this test, as it's coming directly from the mocked ES
    // response, and will be unreliable when filtering.
    expect(alertResultList.total).toEqual(21);

    expect(alertResultList.request_page_index).toEqual(0);
    expect(alertResultList.result_from_index).toEqual(0);
    expect(alertResultList.request_page_size).toEqual(10);
  });

  it('should not support POST requests for querying', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'post',
      body: {},
    });

    const response: SearchResponse<AlertData> = (data as unknown) as SearchResponse<AlertData>;
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));

    expect(routerMock.post.mock.calls).toEqual([]);
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
    expect(alertResultList.request_page_index).toEqual(2);
    expect(alertResultList.result_from_index).toEqual(6);
    expect(alertResultList.request_page_size).toEqual(3);
  });

  it('should accept rison-encoded `filters` and `date_range`', async () => {
    const filters = (encode([
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'host.hostname',
          params: {
            query: 'HD-m3z-4c803698',
          },
        },
        query: {
          match_phrase: {
            'host.hostname': 'HD-m3z-4c803698',
          },
        },
        $state: {
          store: 'appState',
        },
      },
    ]) as unknown) as string;

    const dateRange = (encode({
      to: 'now',
      from: 'now-15y',
    }) as unknown) as string;

    const mockRequest = httpServerMock.createKibanaRequest({
      path: '/api/endpoint/alerts',
      query: {
        page_size: 10,
        filters,
        date_range: dateRange,
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
    expect(alertResultList.request_page_index).toEqual(0);
    expect(alertResultList.result_from_index).toEqual(0);
    expect(alertResultList.request_page_size).toEqual(10);
    expect(alertResultList.next).toEqual(
      `/api/endpoint/alerts?filters=!(('$state':(store:appState),meta:(alias:!n,disabled:!f,key:host.hostname,negate:!f,params:(query:HD-m3z-4c803698),type:phrase),query:(match_phrase:(host.hostname:HD-m3z-4c803698))))&date_range=(from:now-15y,to:now)&page_size=10&sort=@timestamp&order=desc&after=1542341895000&after=undefined`
    );
    expect(alertResultList.prev).toEqual(
      `/api/endpoint/alerts?filters=!(('$state':(store:appState),meta:(alias:!n,disabled:!f,key:host.hostname,negate:!f,params:(query:HD-m3z-4c803698),type:phrase),query:(match_phrase:(host.hostname:HD-m3z-4c803698))))&date_range=(from:now-15y,to:now)&page_size=10&sort=@timestamp&order=desc&before=1542341895000&before=undefined`
    );
  });

  it('should fail to validate when `page_size` is not a number', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        page_size: 'abc',
      });
    };
    expect(validate).toThrow();
  });

  it('should validate when `page_size` is a number', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        page_size: 123,
      });
    };
    expect(validate).not.toThrow();
  });

  it('should validate when `page_size` can be converted to a number', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        page_size: '123',
      });
    };
    expect(validate).not.toThrow();
  });

  it('should allow either `page_index` or `after`, but not both', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        page_index: 1,
        after: [123, 345],
      });
    };
    expect(validate).toThrow();
  });

  it('should allow either `page_index` or `before`, but not both', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        page_index: 1,
        before: 'abc',
      });
    };
    expect(validate).toThrow();
  });

  it('should allow either `before` or `after`, but not both', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        before: ['abc', 'def'],
        after: [123, 345],
      });
    };
    expect(validate).toThrow();
  });
});
